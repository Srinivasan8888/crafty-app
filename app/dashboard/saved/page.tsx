import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import Link from "next/link";

export default async function SavedPage() {
  const user = await requireUser();
  const saves = await prisma.save.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
  });

  // Hydrate names per type
  const [crafters, stores, studios, events] = await Promise.all([
    prisma.crafter.findMany({
      where: { id: { in: saves.filter((s) => s.entity_type === "CRAFTER").map((s) => s.entity_id) } },
      include: { city: true },
    }),
    prisma.store.findMany({
      where: { id: { in: saves.filter((s) => s.entity_type === "STORE").map((s) => s.entity_id) } },
      include: { city: true },
    }),
    prisma.studio.findMany({
      where: { id: { in: saves.filter((s) => s.entity_type === "STUDIO").map((s) => s.entity_id) } },
      include: { city: true },
    }),
    prisma.event.findMany({
      where: { id: { in: saves.filter((s) => s.entity_type === "EVENT").map((s) => s.entity_id) } },
      include: { city: true },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Saved</h1>
      <p className="mt-1 text-sm text-ink-muted">{saves.length} saved item(s).</p>

      <Section title="Crafters">
        {crafters.map((c) => <Row key={c.id} href={`/${c.city.slug}/crafters/${c.slug}`} name={c.name} sub={c.city.display_name} />)}
        {crafters.length === 0 && <Empty />}
      </Section>
      <Section title="Stores">
        {stores.map((s) => <Row key={s.id} href={`/${s.city.slug}/stores/${s.slug}`} name={s.name} sub={s.city.display_name} />)}
        {stores.length === 0 && <Empty />}
      </Section>
      <Section title="Studios">
        {studios.map((s) => <Row key={s.id} href={`/${s.city.slug}/learn/${s.slug}`} name={s.name} sub={s.city.display_name} />)}
        {studios.length === 0 && <Empty />}
      </Section>
      <Section title="Events">
        {events.map((e) => <Row key={e.id} href={`/${e.city.slug}/events/${e.slug}`} name={e.name} sub={e.city.display_name} />)}
        {events.length === 0 && <Empty />}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-subtle">{title}</h2>
      <ul className="grid gap-2">{children}</ul>
    </section>
  );
}
function Row({ href, name, sub }: { href: string; name: string; sub: string }) {
  return (
    <li className="card flex items-center justify-between p-4">
      <div><p className="font-semibold">{name}</p><p className="text-xs text-ink-muted">{sub}</p></div>
      <Link href={href} className="btn btn-sm">Open</Link>
    </li>
  );
}
function Empty() { return <li className="text-sm text-ink-subtle">— nothing saved here yet</li>; }
