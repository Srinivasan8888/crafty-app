import { prisma } from "@/lib/db";
import { setUserRole, setUserBan } from "./actions";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { display_name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { created_at: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      display_name: true,
      role: true,
      is_admin: true,
      is_banned: true,
      created_at: true,
      _count: {
        select: { crafters: true, stores: true, studios: true, events: true },
      },
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="mt-1 text-sm text-ink-muted">PRD §24.3 — search, promote/demote, ban.</p>
      </div>

      <form method="get" className="mb-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by email or name…"
            className="input pl-9"
            aria-label="Search users"
          />
        </div>
        <button type="submit" className="btn btn-sm">Search</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink-subtle">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Listings</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const total = u._count.crafters + u._count.stores + u._count.studios + u._count.events;
              return (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{u.email}</p>
                    {u.display_name && <p className="text-xs text-ink-subtle">{u.display_name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                      u.role === "ADMIN"
                        ? "bg-accent-soft text-accent-fg"
                        : u.role === "CREATOR"
                        ? "bg-canvas-sunken text-ink"
                        : "bg-canvas-sunken text-ink-muted"
                    }`}>
                      {u.role.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{total}</td>
                  <td className="px-4 py-3">
                    {u.is_banned ? <span className="text-danger">banned</span> : <span className="text-ink-subtle">active</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.role !== "ADMIN" && (
                        <form action={setUserRole.bind(null, u.id, "ADMIN")}>
                          <button className="btn btn-ghost btn-sm">Promote</button>
                        </form>
                      )}
                      {u.role === "ADMIN" && (
                        <form action={setUserRole.bind(null, u.id, "CREATOR")}>
                          <button className="btn btn-ghost btn-sm">Demote</button>
                        </form>
                      )}
                      {u.role === "VISITOR" && (
                        <form action={setUserRole.bind(null, u.id, "CREATOR")}>
                          <button className="btn btn-ghost btn-sm">Make creator</button>
                        </form>
                      )}
                      <form action={setUserBan.bind(null, u.id, !u.is_banned)}>
                        <button className={`btn btn-ghost btn-sm ${u.is_banned ? "" : "text-danger"}`}>
                          {u.is_banned ? "Unban" : "Ban"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="p-8 text-center text-sm text-ink-muted">No users match "{q}".</p>
        )}
      </div>
    </div>
  );
}
