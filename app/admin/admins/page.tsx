import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { inviteAdmin, revokeInvite, setAdminRole, transferOwnership } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  let me;
  try {
    me = await requireSuperadmin();
  } catch {
    redirect("/forbidden");
  }

  const [admins, invites] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
      orderBy: [{ role: "desc" }, { email: "asc" }],
      select: { id: true, email: true, display_name: true, role: true },
    }),
    prisma.adminInvite.findMany({
      where: { status: "PENDING" },
      orderBy: { created_at: "desc" },
      select: { id: true, email: true, role: true, expires_at: true, created_at: true },
    }),
  ]);

  return (
    <section className="min-w-0">
      <h1 className="text-2xl font-bold">Admins &amp; owners</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Superadmin-only. Invite people by email, manage admin access, and transfer ownership.
      </p>

      {/* Invite */}
      <div className="card mt-6 p-4">
        <h2 className="font-semibold">Invite someone</h2>
        <p className="mt-1 text-xs text-ink-muted">
          They become the chosen role the next time they sign in with this email — even if they don&apos;t have an account yet.
        </p>
        <form action={inviteAdmin} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="grow">
            <span className="block text-xs text-ink-subtle">Email</span>
            <input
              name="email"
              type="email"
              required
              placeholder="person@example.com"
              className="mt-1 w-full rounded-md border border-line-strong bg-cream px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="block text-xs text-ink-subtle">Role</span>
            <select name="role" className="mt-1 rounded-md border border-line-strong bg-cream px-3 py-2 text-sm">
              <option value="ADMIN">Admin</option>
              <option value="SUPERADMIN">Superadmin (owner)</option>
            </select>
          </label>
          <button type="submit" className="btn btn-primary btn-sm">Send invite</button>
        </form>
      </div>

      {/* Pending invites */}
      <div className="mt-6">
        <h2 className="font-semibold">Pending invites</h2>
        {invites.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No pending invites.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-md border border-line">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{inv.email}</span>{" "}
                  <span className="text-ink-subtle">→ {inv.role}</span>{" "}
                  <span className="text-xs text-ink-subtle">
                    (expires {inv.expires_at.toISOString().slice(0, 10)})
                  </span>
                </span>
                <form action={revokeInvite}>
                  <input type="hidden" name="id" value={inv.id} />
                  <button type="submit" className="btn btn-ghost btn-sm">Revoke</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Current admins */}
      <div className="mt-6">
        <h2 className="font-semibold">Current admins &amp; owners</h2>
        <ul className="mt-2 divide-y divide-line rounded-md border border-line">
          {admins.map((u) => {
            const isSelf = u.id === me!.id;
            return (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{u.display_name ?? u.email}</span>
                  <span className="ml-2 text-xs text-ink-subtle">{u.email}</span>
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.role === "SUPERADMIN" ? "bg-accent text-accent-fg" : "bg-canvas-sunken text-ink"}`}>
                    {u.role}
                  </span>
                  {isSelf && <span className="ml-2 text-xs text-ink-subtle">(you)</span>}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Role change */}
                  <form action={setAdminRole} className="flex items-center gap-1">
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="role" defaultValue={u.role} className="rounded-md border border-line-strong bg-cream px-2 py-1 text-xs">
                      <option value="CREATOR">Creator (revoke admin)</option>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPERADMIN">Superadmin</option>
                    </select>
                    <button type="submit" className="btn btn-ghost btn-sm">Apply</button>
                  </form>
                  {/* Transfer ownership to a non-superadmin */}
                  {u.role !== "SUPERADMIN" && (
                    <form action={transferOwnership} className="flex items-center gap-1">
                      <input type="hidden" name="userId" value={u.id} />
                      <label className="flex items-center gap-1 text-xs text-ink-subtle">
                        <input type="checkbox" name="stepDown" /> step down
                      </label>
                      <button type="submit" className="btn btn-ghost btn-sm">Make owner</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-ink-subtle">
          The last remaining superadmin cannot be demoted — promote another owner first.
        </p>
      </div>
    </section>
  );
}
