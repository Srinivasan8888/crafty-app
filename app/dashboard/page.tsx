import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Sparkles, Store, GraduationCap, Calendar, Plus } from "lucide-react";

export default async function DashboardOverview() {
  const user = await requireUser();
  const [crafters, stores, studios, events, saves] = await Promise.all([
    prisma.crafter.findMany({ where: { owner_user_id: user.id }, include: { city: true } }),
    prisma.store.findMany({ where: { owner_user_id: user.id }, include: { city: true } }),
    prisma.studio.findMany({ where: { owner_user_id: user.id }, include: { city: true } }),
    prisma.event.findMany({ where: { organizer_user_id: user.id }, orderBy: { start_at: "desc" } }),
    prisma.save.count({ where: { user_id: user.id } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome back, {user.display_name ?? "creator"}.</h1>
      <p className="mt-1 text-sm text-ink-muted">Here&apos;s a snapshot of your Crafty presence.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon={<Sparkles size={18} />} label="Crafter" count={crafters.length} cta="/dashboard/crafter/new" ctaLabel="Create" first={crafters[0]?.name} />
        <Tile icon={<Store size={18} />} label="Store" count={stores.length} cta="/dashboard/store/new" ctaLabel="Add" first={stores[0]?.name} />
        <Tile icon={<GraduationCap size={18} />} label="Studio" count={studios.length} cta="/dashboard/studio/new" ctaLabel="Add" first={studios[0]?.name} />
        <Tile icon={<Calendar size={18} />} label="Events" count={events.length} cta="/dashboard/events/new" ctaLabel="Host" first={events[0]?.name} />
      </div>

      <h2 className="mt-10 text-lg font-bold">Your listings</h2>
      <ul className="mt-3 grid gap-3">
        {crafters.map((c) => (
          <li key={c.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-ink-muted">Crafter · {c.city.display_name} · {c.status.toLowerCase()}</p>
            </div>
            <Link href={`/${c.city.slug}/crafters/${c.slug}`} className="btn btn-sm">View</Link>
          </li>
        ))}
        {stores.map((s) => (
          <li key={s.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{s.name}</p>
              <p className="text-xs text-ink-muted">Store · {s.city.display_name} · {s.status.toLowerCase()}</p>
            </div>
            <Link href={`/${s.city.slug}/stores/${s.slug}`} className="btn btn-sm">View</Link>
          </li>
        ))}
        {studios.map((s) => (
          <li key={s.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{s.name}</p>
              <p className="text-xs text-ink-muted">Studio · {s.city.display_name} · {s.status.toLowerCase()}</p>
            </div>
            <Link href={`/${s.city.slug}/learn/${s.slug}`} className="btn btn-sm">View</Link>
          </li>
        ))}
        {crafters.length + stores.length + studios.length === 0 && (
          <li className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">
            No listings yet. <Link href="/dashboard/crafter/new" className="text-accent hover:underline">Create your first one →</Link>
          </li>
        )}
      </ul>

      <p className="mt-8 text-xs text-ink-subtle">{saves} item{saves === 1 ? "" : "s"} saved.</p>
    </div>
  );
}

function Tile({ icon, label, count, cta, ctaLabel, first }: { icon: React.ReactNode; label: string; count: number; cta: string; ctaLabel: string; first?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-sm text-ink-muted">{icon}{label}</div>
      <p className="mt-1 text-3xl font-extrabold">{count}</p>
      {first && <p className="mt-1 text-xs text-ink-subtle truncate">{first}</p>}
      <Link href={cta} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">
        <Plus size={12} /> {ctaLabel}
      </Link>
    </div>
  );
}
