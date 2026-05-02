import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminListings() {
  const [crafters, stores, studios, events] = await Promise.all([
    prisma.crafter.findMany({ include: { city: true } }),
    prisma.store.findMany({ include: { city: true } }),
    prisma.studio.findMany({ include: { city: true } }),
    prisma.event.findMany({ include: { city: true }, orderBy: { start_at: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Listings</h1>
      <p className="mt-1 text-sm text-ink-muted">{crafters.length + stores.length + studios.length + events.length} total</p>

      <Section title={`Crafters (${crafters.length})`}>
        <Table rows={crafters.map((c) => ({ id: c.id, name: c.name, city: c.city.display_name, slug: c.slug, type: "crafter", status: c.status, featured: c.is_featured }))} />
      </Section>
      <Section title={`Stores (${stores.length})`}>
        <Table rows={stores.map((s) => ({ id: s.id, name: s.name, city: s.city.display_name, slug: s.slug, type: "store", status: s.status, featured: s.is_featured }))} />
      </Section>
      <Section title={`Studios (${studios.length})`}>
        <Table rows={studios.map((s) => ({ id: s.id, name: s.name, city: s.city.display_name, slug: s.slug, type: "studio", status: s.status, featured: s.is_featured }))} />
      </Section>
      <Section title={`Events (${events.length})`}>
        <Table rows={events.map((e) => ({ id: e.id, name: e.name, city: e.city.display_name, slug: e.slug, type: "event", status: e.status, featured: e.is_featured }))} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-subtle">{title}</h2>
      {children}
    </section>
  );
}

function Table({ rows }: { rows: { id: string; name: string; city: string; slug: string; type: string; status: string; featured: boolean }[] }) {
  if (rows.length === 0) return <p className="text-sm text-ink-subtle">— none yet</p>;
  const path = (r: any) => r.type === "crafter" ? `/${r.city.toLowerCase().replace(/\s+/g, "-")}/crafters/${r.slug}` :
                          r.type === "store" ? `/${r.city.toLowerCase().replace(/\s+/g, "-")}/stores/${r.slug}` :
                          r.type === "studio" ? `/${r.city.toLowerCase().replace(/\s+/g, "-")}/learn/${r.slug}` :
                                              `/${r.city.toLowerCase().replace(/\s+/g, "-")}/events/${r.slug}`;
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-canvas-sunken text-left text-xs uppercase tracking-wider text-ink-subtle">
          <tr><th className="p-3">Name</th><th className="p-3">City</th><th className="p-3">Status</th><th className="p-3">Featured</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-line">
              <td className="p-3 font-medium">{r.name}</td>
              <td className="p-3">{r.city}</td>
              <td className="p-3 text-ink-muted">{r.status.toLowerCase()}</td>
              <td className="p-3">{r.featured ? "★" : "—"}</td>
              <td className="p-3"><Link href={path(r)} className="text-accent hover:underline">view</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
