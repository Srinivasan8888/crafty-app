import { prisma } from "@/lib/db";
import Link from "next/link";
import { toggleFeatured, setStatus, transferOwnership } from "./actions";

export const dynamic = "force-dynamic";

type Kind = "crafter" | "store" | "studio" | "event";
type Row = {
  id: string;
  name: string;
  city: string;
  citySlug: string;
  slug: string;
  type: Kind;
  status: string;
  featured: boolean;
  claimed: boolean;
};

export default async function AdminListings() {
  const [crafters, stores, studios, events] = await Promise.all([
    prisma.crafter.findMany({ include: { city: true }, orderBy: { created_at: "desc" } }),
    prisma.store.findMany({ include: { city: true }, orderBy: { created_at: "desc" } }),
    prisma.studio.findMany({ include: { city: true }, orderBy: { created_at: "desc" } }),
    prisma.event.findMany({ include: { city: true }, orderBy: { start_at: "asc" } }),
  ]);

  const buildRow = <T extends { id: string; name: string; slug: string; status: string; is_featured: boolean; city: { display_name: string; slug: string } }>(
    e: T,
    type: Kind,
    claimed: boolean,
  ): Row => ({
    id: e.id,
    name: e.name,
    city: e.city.display_name,
    citySlug: e.city.slug,
    slug: e.slug,
    type,
    status: e.status,
    featured: e.is_featured,
    claimed,
  });

  const total = crafters.length + stores.length + studios.length + events.length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Listings</h1>
      <p className="mt-1 text-sm text-ink-muted">{total} total. Row actions: Feature, Hide, Restore, Transfer.</p>

      <Section title={`Crafters (${crafters.length})`}>
        <Table rows={crafters.map((c) => buildRow(c, "crafter", c.is_claimed))} />
      </Section>
      <Section title={`Stores (${stores.length})`}>
        <Table rows={stores.map((s) => buildRow(s, "store", s.is_claimed))} />
      </Section>
      <Section title={`Studios (${studios.length})`}>
        <Table rows={studios.map((s) => buildRow(s, "studio", s.is_claimed))} />
      </Section>
      <Section title={`Events (${events.length})`}>
        {/* Events don't have is_claimed; they always belong to their organizer. */}
        <Table rows={events.map((e) => buildRow(e, "event", true))} />
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

function publicPath(r: Row): string {
  const seg = r.type === "crafter" ? "crafters" : r.type === "store" ? "stores" : r.type === "studio" ? "learn" : "events";
  return `/${r.citySlug}/${seg}/${r.slug}`;
}

function Table({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return <p className="text-sm text-ink-subtle">— none yet</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-canvas-sunken text-left text-xs uppercase tracking-wider text-ink-subtle">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">City</th>
            <th className="p-3">Status</th>
            <th className="p-3">★</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-line align-top">
              <td className="p-3 font-medium">
                {r.name}
                {!r.claimed && <span className="ml-2 inline-flex rounded-full bg-canvas-sunken px-2 py-0.5 text-xs text-ink-muted">unclaimed</span>}
              </td>
              <td className="p-3">{r.city}</td>
              <td className="p-3 text-ink-muted">{r.status.toLowerCase()}</td>
              <td className="p-3">{r.featured ? "★" : "—"}</td>
              <td className="p-3">
                <div className="flex flex-wrap gap-1">
                  <Link href={publicPath(r)} className="btn btn-ghost btn-sm">view</Link>
                  <form action={toggleFeatured.bind(null, r.type, r.id)}>
                    <button className="btn btn-ghost btn-sm">{r.featured ? "Unfeature" : "Feature"}</button>
                  </form>
                  {r.status !== "HIDDEN" && (
                    <form action={setStatus.bind(null, r.type, r.id, "HIDDEN")}>
                      <button className="btn btn-ghost btn-sm">Hide</button>
                    </form>
                  )}
                  {r.status !== "PUBLISHED" && (
                    <form action={setStatus.bind(null, r.type, r.id, "PUBLISHED")}>
                      <button className="btn btn-ghost btn-sm">Restore</button>
                    </form>
                  )}
                  {r.status !== "DELETED" && (
                    <form action={setStatus.bind(null, r.type, r.id, "DELETED")}>
                      <button className="btn btn-ghost btn-sm text-danger">Delete</button>
                    </form>
                  )}
                </div>
                {!r.claimed && r.type !== "event" && (
                  <form
                    action={transferOwnership.bind(null, r.type, r.id)}
                    className="mt-2 flex items-center gap-1"
                  >
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="owner@example.com"
                      className="input"
                      style={{ padding: "4px 8px", fontSize: 12, maxWidth: 200 }}
                    />
                    <button className="btn btn-ghost btn-sm">Transfer</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
