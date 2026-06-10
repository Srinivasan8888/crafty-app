import { prisma } from "@/lib/db";
import { AiTriageButton } from "./_AiTriageButton";

export default async function AdminFlags() {
  const [pending, dismissed, hidden, total] = await Promise.all([
    prisma.flag.count({ where: { status: "PENDING" } }),
    prisma.flag.count({ where: { status: "DISMISSED" } }),
    prisma.flag.count({ where: { status: "HIDDEN" } }),
    prisma.flag.count(),
  ]);
  const flags = await prisma.flag.findMany({
    where: { status: "PENDING" },
    orderBy: { created_at: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Moderation queue</h1>
      <p className="mt-1 text-sm text-ink-muted">{pending} pending · {dismissed} dismissed · {hidden} hidden · {total} total</p>

      {flags.length === 0 ? (
        <div className="mt-8 card p-8 text-center text-sm text-ink-muted">All clear. Flags will land here as they come in.</div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-canvas-sunken text-left text-xs uppercase tracking-wider text-ink-subtle">
              <tr>
                <th className="p-3">Entity</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Reporter</th>
                <th className="p-3">Note</th>
                <th className="p-3">Created</th>
                <th className="p-3">AI</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.id} className="border-t border-line align-top">
                  <td className="p-3">{f.entity_type} · {f.entity_id.slice(0, 8)}</td>
                  <td className="p-3">{f.reason.toLowerCase()}</td>
                  <td className="p-3">{f.reporter_email ?? "anonymous"}</td>
                  <td className="p-3">{f.note ?? "—"}</td>
                  <td className="p-3 text-ink-subtle">{f.created_at.toLocaleString("en-IN")}</td>
                  <td className="p-3"><AiTriageButton flagId={f.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
