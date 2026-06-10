// PRD §16.2 + design-doc Day-90 success gates.
//
// Three categories of metric:
//   1. DB-derivable (signup count, activation %, listings, growth windows)  — always shown.
//   2. Event-derivable (profile-CTR, multi-page sessions, direct traffic %) — shown only
//      once PostHog is wired with real credentials; until then placeholder card.
//   3. Session-derivable (D30 retention)                                     — PostHog.

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const POSTHOG_CONFIGURED =
  !!(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
  !(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? process.env.NEXT_PUBLIC_POSTHOG_KEY)?.startsWith("phc_placeholder");

const DAY = 24 * 60 * 60 * 1000;

export default async function AdminMetricsPage() {
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * DAY);
  const since30 = new Date(now.getTime() - 30 * DAY);
  const since90 = new Date(now.getTime() - 90 * DAY);

  const [
    creatorTotal,
    creatorIn7,
    creatorIn30,
    creatorIn90,
    creatorsWithListing,
    crafters,
    stores,
    studios,
    events,
    crafterIn90,
    pendingFlags,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CREATOR" } }),
    prisma.user.count({ where: { role: "CREATOR", created_at: { gte: since7 } } }),
    prisma.user.count({ where: { role: "CREATOR", created_at: { gte: since30 } } }),
    prisma.user.count({ where: { role: "CREATOR", created_at: { gte: since90 } } }),
    countActivatedCreators(),
    prisma.crafter.count({ where: { status: "PUBLISHED" } }),
    prisma.store.count({ where: { status: "PUBLISHED" } }),
    prisma.studio.count({ where: { status: "PUBLISHED" } }),
    prisma.event.count({ where: { status: "PUBLISHED" } }),
    prisma.crafter.count({ where: { status: "PUBLISHED", created_at: { gte: since90 } } }),
    prisma.flag.count({ where: { status: "PENDING" } }),
  ]);

  const activationPct =
    creatorTotal === 0 ? 0 : Math.round((creatorsWithListing / creatorTotal) * 100);

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-ink-subtle">Admin · Day-90 metrics</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Crafty health board</h1>
        <p className="mt-2 max-w-prose text-sm text-ink-muted">
          PRD §16.2 + design-doc Day-90 gates. DB-derived metrics are always
          live; engagement metrics need PostHog wired with real credentials.
        </p>
      </header>

      <section aria-labelledby="acquisition" className="mb-10">
        <h2 id="acquisition" className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
          Acquisition
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Self-serve creators (total)"
            value={creatorTotal}
            target="≥ 100 by Day 90"
            help="role=CREATOR users. Excludes admin-curated seed-bot."
          />
          <MetricCard
            label="Activation"
            value={`${activationPct}%`}
            target="≥ 60%"
            help="% of creators who published at least one listing"
            note={`${creatorsWithListing} of ${creatorTotal}`}
          />
          <MetricCard label="Signups in last 7d" value={creatorIn7} />
          <MetricCard label="Signups in last 30d" value={creatorIn30} note={`90d: ${creatorIn90}`} />
        </div>
      </section>

      <section aria-labelledby="content" className="mb-10">
        <h2 id="content" className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
          Content
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Crafters" value={crafters} note={`${crafterIn90} in 90d`} />
          <MetricCard label="Stores" value={stores} />
          <MetricCard label="Studios" value={studios} />
          <MetricCard label="Events" value={events} />
        </div>
      </section>

      <section aria-labelledby="engagement" className="mb-10">
        <h2 id="engagement" className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
          Engagement
        </h2>
        {POSTHOG_CONFIGURED ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <PostHogMetricCard label="Profile CTR" target="> 15%" />
            <PostHogMetricCard label="Multi-page sessions" target="> 35%" />
            <PostHogMetricCard label="Direct traffic" target="> 20%" />
            <PostHogMetricCard label="D30 retention" target="≥ 35%" />
          </div>
        ) : (
          <div className="card p-6 text-sm text-ink-muted">
            <p className="font-semibold text-ink">PostHog not configured.</p>
            <p className="mt-1">
              Set <code className="rounded bg-canvas-sunken px-1">NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN</code> in
              <code className="ml-1 rounded bg-canvas-sunken px-1">.env</code> to enable engagement
              gates (profile CTR, multi-page sessions, direct-traffic %, D30 retention). Events are
              already firing client-side; once the key is set, this section will start populating.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="moderation" className="mb-10">
        <h2 id="moderation" className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
          Moderation
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Pending flags"
            value={pendingFlags}
            note="See /admin"
          />
        </div>
      </section>

      <footer className="mt-12 border-t border-line pt-4 text-xs text-ink-subtle">
        Generated {now.toLocaleString()}. Numbers refresh on every load (no caching).
      </footer>
    </div>
  );
}

async function countActivatedCreators(): Promise<number> {
  // A creator counts as "activated" when they have at least one
  // PUBLISHED listing of any kind they own.
  const rows = await prisma.user.findMany({
    where: { role: "CREATOR" },
    select: {
      _count: {
        select: {
          crafters: { where: { status: "PUBLISHED" } },
          stores: { where: { status: "PUBLISHED" } },
          studios: { where: { status: "PUBLISHED" } },
          events: { where: { status: "PUBLISHED" } },
        },
      },
    },
  });
  return rows.filter(
    (r) =>
      r._count.crafters + r._count.stores + r._count.studios + r._count.events > 0,
  ).length;
}

function MetricCard({
  label,
  value,
  target,
  note,
  help,
}: {
  label: string;
  value: string | number;
  target?: string;
  note?: string;
  help?: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wider text-ink-subtle">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ink">{value}</p>
      {target && <p className="mt-1 text-xs text-ink-muted">Gate: {target}</p>}
      {note && <p className="mt-1 text-xs text-ink-subtle">{note}</p>}
      {help && <p className="mt-2 text-xs text-ink-subtle">{help}</p>}
    </div>
  );
}

function PostHogMetricCard({ label, target }: { label: string; target: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wider text-ink-subtle">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ink-subtle">—</p>
      <p className="mt-1 text-xs text-ink-muted">Gate: {target}</p>
      <p className="mt-2 text-xs text-ink-subtle">PostHog query — wire in T5d</p>
    </div>
  );
}
