// V1.5 — admin queue for buyer-submitted city requests. Lets the founder see
// which unsupported cities have the most demand and mark them resolved as
// they're rolled out.

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function toggleResolved(id: string, resolved: boolean) {
  "use server";
  await requireAdmin();
  await prisma.cityRequest.update({
    where: { id },
    data: { resolved, resolved_at: resolved ? new Date() : null },
  });
  revalidatePath("/admin/city-requests");
}

export default async function AdminCityRequestsPage() {
  const rows = await prisma.cityRequest.findMany({
    orderBy: [{ resolved: "asc" }, { count: "desc" }, { created_at: "desc" }],
    take: 200,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">City requests</h1>
        <p className="mt-1 text-sm text-ink-muted">
          PRD §28.2 Q2 / V1.5 — buyer suggestions for cities not yet supported.
          Sorted by request count.
        </p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink-subtle">
            <tr>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Requests</th>
              <th className="px-4 py-3">First reporter</th>
              <th className="px-4 py-3">IP country</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium text-ink">{r.city_name}</td>
                <td className="px-4 py-3 text-ink-muted">{r.region ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{r.count}</td>
                <td className="px-4 py-3 text-ink-muted">{r.reporter_email ?? "anon"}</td>
                <td className="px-4 py-3 text-ink-muted">{r.ip_country ?? "—"}</td>
                <td className="px-4 py-3">
                  {r.resolved
                    ? <span className="text-success">resolved</span>
                    : <span className="text-ink-subtle">open</span>}
                </td>
                <td className="px-4 py-3">
                  <form action={toggleResolved.bind(null, r.id, !r.resolved)}>
                    <button className="btn btn-ghost btn-sm">
                      {r.resolved ? "Reopen" : "Mark resolved"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-ink-muted">No city requests yet.</p>
        )}
      </div>
    </div>
  );
}
