import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 60;

function inr(n: number | null | undefined): string {
  return "₹" + (n ?? 0).toLocaleString("en-IN");
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wider text-ink-subtle">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

function Group({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xs font-bold uppercase tracking-[2px] text-forest">{title}</h2>
        {href && <Link href={href} className="text-xs text-accent hover:underline">Open →</Link>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </section>
  );
}

export default async function OwnerConsole() {
  try {
    await requireSuperadmin();
  } catch {
    redirect("/forbidden");
  }

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86_400_000);
  const d30 = new Date(now.getTime() - 30 * 86_400_000);
  const pub = { status: "PUBLISHED" as const };

  const [
    usersTotal, usersNew7, usersNew30, usersBanned, usersByRole,
    crafters, stores, studios, events,
    orderAgg, payoutPending, payoutPaid, subsActive,
    saves7, messages7, reviews7,
    flagsOpen, claimsPending, cityReqOpen,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { created_at: { gte: d7 } } }),
    prisma.user.count({ where: { created_at: { gte: d30 } } }),
    prisma.user.count({ where: { is_banned: true } }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.crafter.count({ where: pub }),
    prisma.store.count({ where: pub }),
    prisma.studio.count({ where: pub }),
    prisma.event.count({ where: pub }),
    prisma.order.aggregate({
      where: { status: { in: ["PAID", "FULFILLED"] } },
      _sum: { total_inr: true, platform_fee_inr: true },
      _count: { _all: true },
    }),
    prisma.payout.aggregate({ where: { status: "PENDING" }, _sum: { amount_inr: true } }),
    prisma.payout.aggregate({ where: { status: "PAID" }, _sum: { amount_inr: true } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.save.count({ where: { created_at: { gte: d7 } } }),
    prisma.message.count({ where: { created_at: { gte: d7 } } }),
    prisma.review.count({ where: { created_at: { gte: d7 } } }),
    prisma.flag.count({ where: { status: "PENDING" } }),
    prisma.claimRequest.count({ where: { status: "PENDING" } }),
    prisma.cityRequest.count({ where: { resolved: false } }),
  ]);

  const role = (r: string) => usersByRole.find((x) => x.role === r)?._count._all ?? 0;
  const listingsTotal = crafters + stores + studios + events;

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Owner console</h1>
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-fg">GOD MODE</span>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Read-only, app-wide overview. Cards link to the tools that can act on each area.
      </p>

      <Group title="People" href="/admin/users">
        <Stat label="Total users" value={usersTotal.toLocaleString("en-IN")} sub={`+${usersNew7} in 7d · +${usersNew30} in 30d`} />
        <Stat label="Creators" value={role("CREATOR").toLocaleString("en-IN")} />
        <Stat label="Admins / owners" value={(role("ADMIN") + role("SUPERADMIN")).toLocaleString("en-IN")} sub={`${role("SUPERADMIN")} owner(s)`} />
        <Stat label="Banned" value={usersBanned.toLocaleString("en-IN")} />
      </Group>

      <Group title="Listings (published)" href="/admin/listings">
        <Stat label="All listings" value={listingsTotal.toLocaleString("en-IN")} />
        <Stat label="Crafters" value={crafters.toLocaleString("en-IN")} />
        <Stat label="Stores" value={stores.toLocaleString("en-IN")} />
        <Stat label="Studios" value={studios.toLocaleString("en-IN")} />
        <Stat label="Events" value={events.toLocaleString("en-IN")} />
      </Group>

      <Group title="Commerce" href="/admin/metrics">
        <Stat label="Paid orders" value={(orderAgg._count._all ?? 0).toLocaleString("en-IN")} />
        <Stat label="GMV" value={inr(orderAgg._sum.total_inr)} sub="paid + fulfilled" />
        <Stat label="Commission" value={inr(orderAgg._sum.platform_fee_inr)} />
        <Stat label="Payouts pending" value={inr(payoutPending._sum.amount_inr)} sub={`${inr(payoutPaid._sum.amount_inr)} paid`} />
        <Stat label="Active PRO subs" value={subsActive.toLocaleString("en-IN")} />
      </Group>

      <Group title="Engagement (7d)">
        <Stat label="Saves" value={saves7.toLocaleString("en-IN")} />
        <Stat label="Messages" value={messages7.toLocaleString("en-IN")} />
        <Stat label="Reviews" value={reviews7.toLocaleString("en-IN")} />
      </Group>

      <Group title="Moderation queue">
        <Stat label="Open flags" value={flagsOpen.toLocaleString("en-IN")} />
        <Stat label="Claim requests" value={claimsPending.toLocaleString("en-IN")} />
        <Stat label="City requests" value={cityReqOpen.toLocaleString("en-IN")} />
      </Group>

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link href="/admin" className="text-accent hover:underline">Flag queue →</Link>
        <Link href="/admin/claim-requests" className="text-accent hover:underline">Claim requests →</Link>
        <Link href="/admin/city-requests" className="text-accent hover:underline">City requests →</Link>
        <Link href="/admin/health" className="text-accent hover:underline">Cron health →</Link>
        <Link href="/admin/audit-log" className="text-accent hover:underline">Audit log →</Link>
        <Link href="/admin/admins" className="text-accent hover:underline">Manage admins →</Link>
      </div>
    </section>
  );
}
