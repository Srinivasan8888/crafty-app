// PRD §7.14 / §10.5 — cron health monitor. Shows the latest recorded run per
// scheduled job so silent scheduler failures are visible. A job whose most
// recent run is older than CRON_STALE_MS (or never recorded) is flagged. Runs
// under the admin layout, which already gates on requireAdmin().
import { prisma } from "@/lib/db";
import { CRON_JOBS, CRON_STALE_MS } from "@/lib/cron";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cron health · Admin · Crafty" };

function relative(d: Date | null | undefined): string {
  if (!d) return "never";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function CronHealthPage() {
  const rows = await Promise.all(
    CRON_JOBS.map((job) =>
      prisma.cronRun
        .findFirst({ where: { job_name: job.name }, orderBy: { started_at: "desc" } })
        .then((run) => ({ job, run })),
    ),
  );

  const now = Date.now();
  const decorated = rows.map(({ job, run }) => {
    const lastAt = run?.completed_at ?? run?.started_at ?? null;
    const stale = !lastAt || now - new Date(lastAt).getTime() > CRON_STALE_MS;
    return { job, run, lastAt, stale };
  });
  const staleCount = decorated.filter((r) => r.stale).length;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Cron health</h1>
        <p className="text-sm text-ink-muted">
          {staleCount === 0 ? (
            <span className="text-success">All {decorated.length} jobs healthy</span>
          ) : (
            <span className="text-danger font-semibold">{staleCount} of {decorated.length} jobs stale</span>
          )}
        </p>
      </div>
      <p className="mt-1 text-sm text-ink-subtle">
        A job is flagged when its most recent run is older than 25h (or never recorded). Records are written by each handler on success.
      </p>

      <div className="card mt-5 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-subtle">
              <th className="px-4 py-3 font-semibold">Job</th>
              <th className="px-4 py-3 font-semibold">Cadence</th>
              <th className="px-4 py-3 font-semibold">Last run</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Rows</th>
            </tr>
          </thead>
          <tbody>
            {decorated.map(({ job, run, lastAt, stale }) => (
              <tr key={job.name} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3">
                  <span className="font-semibold text-ink">{job.label}</span>
                  <span className="ml-2 text-xs text-ink-subtle">{job.name}</span>
                </td>
                <td className="px-4 py-3 capitalize text-ink-muted">{job.cadence}</td>
                <td className={`px-4 py-3 ${stale ? "font-semibold text-danger" : "text-ink-muted"}`}>
                  {relative(lastAt)}
                </td>
                <td className="px-4 py-3">
                  {stale ? (
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
                      {run ? "stale" : "never run"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                      healthy
                    </span>
                  )}
                  {run?.status === "error" && (
                    <span className="ml-2 text-xs text-danger" title={run.error_message ?? ""}>
                      error
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-muted">{run?.rows_affected ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
