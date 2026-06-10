// V3 Tier 3 — Admin view of all API keys across all users. Can revoke any.

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function revokeKey(id: string) {
  "use server";
  const admin = await requireAdmin();
  await prisma.apiKey.update({ where: { id }, data: { revoked_at: new Date() } });
  void logAudit({
    actorUserId: admin.id, action: "api_key.revoke_by_admin",
    entityType: "USER", entityId: id, metadata: { key_id: id },
  });
  revalidatePath("/admin/api-keys");
}

export default async function AdminApiKeysPage() {
  await requireAdmin();
  const rows = await prisma.apiKey.findMany({
    orderBy: [{ created_at: "desc" }],
    take: 500,
    include: { owner: { select: { email: true, display_name: true } } },
  });
  // Sort active keys first in-process.
  rows.sort((a, b) => {
    if (!a.revoked_at && b.revoked_at) return -1;
    if (a.revoked_at && !b.revoked_at) return 1;
    return +b.created_at - +a.created_at;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">API keys</h1>
        <p className="mt-1 text-sm text-ink-muted">
          All keys across all users. Use the dashboard view for your own keys.
        </p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink-subtle">
            <tr>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Prefix</th>
              <th className="px-4 py-3">Scopes</th>
              <th className="px-4 py-3">RPM</th>
              <th className="px-4 py-3">Last used</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k.id} className="border-t border-line">
                <td className="px-4 py-3 text-ink-muted">
                  {k.owner ? (k.owner.display_name ?? k.owner.email) : "—"}
                </td>
                <td className="px-4 py-3 font-medium text-ink">{k.name}</td>
                <td className="px-4 py-3 font-mono text-xs">crafty_{k.prefix}…</td>
                <td className="px-4 py-3 text-xs text-ink-muted">{k.scopes.join(", ")}</td>
                <td className="px-4 py-3 text-ink-muted">{k.rate_limit_per_min}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {k.last_used_at ? k.last_used_at.toISOString().slice(0, 10) : "—"}
                </td>
                <td className="px-4 py-3 text-ink-muted">{k.created_at.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-3">
                  {k.revoked_at
                    ? <span className="text-danger">revoked</span>
                    : <span className="text-success">active</span>}
                </td>
                <td className="px-4 py-3">
                  {!k.revoked_at && (
                    <form action={revokeKey.bind(null, k.id)}>
                      <button className="btn btn-ghost btn-sm text-danger" type="submit">Revoke</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-ink-muted">No API keys yet.</p>
        )}
      </div>
    </div>
  );
}
