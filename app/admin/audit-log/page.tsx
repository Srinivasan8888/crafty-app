// PRD §26.2 (V1.5) — admin audit log viewer.
// Reads AuditLog rows written by lib/audit.ts. Paginated, filterable by
// actor email, action prefix, and entity type.

import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: { actor?: string; action?: string; entity?: string; page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const actorFilter = (searchParams.actor ?? "").trim();
  const actionFilter = (searchParams.action ?? "").trim();
  const entityFilter = (searchParams.entity ?? "").trim().toUpperCase();

  // Resolve actor filter to a user_id if it looks like an email.
  let actorUserIds: string[] | undefined;
  if (actorFilter) {
    const matches = await prisma.user.findMany({
      where: { email: { contains: actorFilter, mode: "insensitive" } },
      select: { id: true },
      take: 50,
    });
    actorUserIds = matches.map((u) => u.id);
    if (actorUserIds.length === 0) {
      // No matching actors — short-circuit with empty result rather than
      // pulling everything.
      actorUserIds = ["__no_match__"];
    }
  }

  const where = {
    ...(actorUserIds && { actor_user_id: { in: actorUserIds } }),
    ...(actionFilter && { action: { contains: actionFilter, mode: "insensitive" as const } }),
    ...(entityFilter && { entity_type: entityFilter }),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Bulk-fetch actor users to avoid N+1.
  const actorIds = [...new Set(rows.map((r) => r.actor_user_id))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, email: true, display_name: true },
  });
  const actorById = new Map(actors.map((u) => [u.id, u]));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit log</h1>
        <p className="mt-1 text-sm text-ink-muted">
          PRD §24 / V1.5 — every admin action and owner mutation that mattered.
          {total > 0 && ` Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}.`}
        </p>
      </div>

      <form method="get" className="mb-5 grid gap-2 sm:grid-cols-4">
        <input
          name="actor"
          defaultValue={actorFilter}
          placeholder="Actor email…"
          className="input"
          aria-label="Filter by actor email"
        />
        <input
          name="action"
          defaultValue={actionFilter}
          placeholder="Action contains…"
          className="input"
          aria-label="Filter by action substring"
        />
        <select name="entity" defaultValue={entityFilter} className="input" aria-label="Filter by entity type">
          <option value="">— Any entity —</option>
          {(["USER", "CRAFTER", "STORE", "STUDIO", "EVENT", "FLAG", "CITY", "CITY_REQUEST", "CATEGORY", "EXPORT", "WEBHOOK"]).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-sm">Filter</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink-subtle">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const a = actorById.get(r.actor_user_id);
              return (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">
                    {r.created_at.toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{a?.email ?? <span className="text-ink-subtle">deleted user</span>}</p>
                    {a?.display_name && <p className="text-xs text-ink-subtle">{a.display_name}</p>}
                  </td>
                  <td className="px-4 py-3"><code className="rounded bg-canvas-sunken px-1.5 py-0.5 text-xs">{r.action}</code></td>
                  <td className="px-4 py-3 text-ink-muted text-xs">
                    {r.entity_type
                      ? <><span>{r.entity_type}</span>{r.entity_id && <span className="text-ink-subtle"> · {r.entity_id.slice(-6)}</span>}</>
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.metadata
                      ? <code className="block max-w-md truncate font-mono text-ink-subtle">{JSON.stringify(r.metadata)}</code>
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-ink-muted">
            No audit events match those filters{total === 0 && " — nothing has been logged yet"}.
          </p>
        )}
      </div>

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1
            ? <PageLink searchParams={searchParams} page={page - 1}>← Prev</PageLink>
            : <span />}
          <p className="text-ink-subtle">Page {page} of {pages}</p>
          {page < pages
            ? <PageLink searchParams={searchParams} page={page + 1}>Next →</PageLink>
            : <span />}
        </nav>
      )}
    </div>
  );
}

function PageLink({
  searchParams,
  page,
  children,
}: {
  searchParams: { actor?: string; action?: string; entity?: string };
  page: number;
  children: React.ReactNode;
}) {
  const qs = new URLSearchParams();
  if (searchParams.actor) qs.set("actor", searchParams.actor);
  if (searchParams.action) qs.set("action", searchParams.action);
  if (searchParams.entity) qs.set("entity", searchParams.entity);
  qs.set("page", String(page));
  return (
    <Link href={`/admin/audit-log?${qs}`} className="btn btn-ghost btn-sm">
      {children}
    </Link>
  );
}
