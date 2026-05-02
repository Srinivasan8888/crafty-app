import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { CrafterCard, StoreCard, StudioCard, EventCard } from "@/components/Cards";
import Link from "next/link";

export const revalidate = 0;

type RawHit = { id: string };

export default async function SearchPage({
  params, searchParams,
}: { params: { city: string }; searchParams: { q?: string } }) {
  const city = await getCityBySlug(params.city);
  if (!city) notFound();

  const q = (searchParams.q ?? "").trim();
  let crafters: any[] = [], stores: any[] = [], studios: any[] = [], events: any[] = [];

  if (q.length >= 2) {
    // City-scoped FTS via Postgres tsquery. Issue 2.3 search_vector is auto-maintained.
    const safe = q.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).join(" & ");

    const [cIds, sIds, stIds, eIds] = await Promise.all([
      prisma.$queryRawUnsafe<RawHit[]>(
        `SELECT id FROM "Crafter" WHERE city_id = $1 AND status = 'PUBLISHED' AND search_vector @@ to_tsquery('simple', $2) LIMIT 6`,
        city.id, safe,
      ),
      prisma.$queryRawUnsafe<RawHit[]>(
        `SELECT id FROM "Store"   WHERE city_id = $1 AND status = 'PUBLISHED' AND search_vector @@ to_tsquery('simple', $2) LIMIT 6`,
        city.id, safe,
      ),
      prisma.$queryRawUnsafe<RawHit[]>(
        `SELECT id FROM "Studio"  WHERE city_id = $1 AND status = 'PUBLISHED' AND search_vector @@ to_tsquery('simple', $2) LIMIT 6`,
        city.id, safe,
      ),
      prisma.$queryRawUnsafe<RawHit[]>(
        `SELECT id FROM "Event"   WHERE city_id = $1 AND status = 'PUBLISHED' AND end_at >= NOW() AND search_vector @@ to_tsquery('simple', $2) LIMIT 6`,
        city.id, safe,
      ),
    ]);

    [crafters, stores, studios, events] = await Promise.all([
      prisma.crafter.findMany({
        where: { id: { in: cIds.map((r) => r.id) } },
        include: { craft_categories: { include: { category: true } } },
      }),
      prisma.store.findMany({
        where: { id: { in: sIds.map((r) => r.id) } },
        include: { supply_categories: { include: { category: true } } },
      }),
      prisma.studio.findMany({
        where: { id: { in: stIds.map((r) => r.id) } },
        include: { craft_disciplines: { include: { discipline: true } } },
      }),
      prisma.event.findMany({ where: { id: { in: eIds.map((r) => r.id) } } }),
    ]);
  }

  const total = crafters.length + stores.length + studios.length + events.length;

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Search Crafty in {city.display_name}
        </h1>
        <form className="mt-4 flex max-w-xl gap-2" method="get">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
            <input
              autoFocus name="q" defaultValue={q} placeholder="Try yarn, pottery, Cubbon meetup…"
              className="input pl-9" type="search"
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <p className="mt-3 text-sm text-ink-muted">
          {q.length < 2 ? "Type at least 2 characters to search." : `${total} matches`}
        </p>
      </header>

      {q.length >= 2 && total === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-canvas-sunken/40 p-12 text-center text-ink-muted">
          No matches. Try a different keyword.
        </div>
      )}

      {crafters.length > 0 && (
        <Section title="Crafters" seeAll={`/${city.slug}/crafters`}>
          {crafters.map((c) => (
            <div key={c.id} className="w-[240px] shrink-0">
              <CrafterCard
                city={city.slug} slug={c.slug} name={c.name} tagline={c.tagline}
                profile_photo={c.profile_photo}
                categories={c.craft_categories.map((j: any) => j.category.display_name)}
              />
            </div>
          ))}
        </Section>
      )}

      {stores.length > 0 && (
        <Section title="Stores" seeAll={`/${city.slug}/stores`}>
          {stores.map((s) => (
            <div key={s.id} className="w-[260px] shrink-0">
              <StoreCard
                city={city.slug} slug={s.slug} name={s.name} logo_photo={s.logo_photo} address={s.address}
                categories={s.supply_categories.map((j: any) => j.category.display_name)}
                is_claimed={s.is_claimed}
              />
            </div>
          ))}
        </Section>
      )}

      {studios.length > 0 && (
        <Section title="Studios" seeAll={`/${city.slug}/learn`}>
          {studios.map((s) => (
            <div key={s.id} className="w-[260px] shrink-0">
              <StudioCard
                city={city.slug} slug={s.slug} name={s.name} logo_photo={s.logo_photo}
                address={s.address} age_group={s.age_group}
                disciplines={s.craft_disciplines.map((j: any) => j.discipline.display_name)}
              />
            </div>
          ))}
        </Section>
      )}

      {events.length > 0 && (
        <Section title="Events" seeAll={`/${city.slug}/events`}>
          {events.map((e) => (
            <div key={e.id} className="w-[300px] shrink-0">
              <EventCard
                city={city.slug} slug={e.slug} name={e.name} cover_image={e.cover_image}
                start_at={e.start_at} venue_name={e.venue_name} is_free={e.is_free}
                price_amount={e.price_amount?.toString()} event_type={e.event_type}
              />
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, seeAll, children }: { title: string; seeAll: string; children: React.ReactNode }) {
  return (
    <section className="my-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        <Link href={seeAll} className="text-sm font-semibold text-accent hover:underline">See all {title.toLowerCase()} →</Link>
      </div>
      <div className="snap-rail no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {children}
      </div>
    </section>
  );
}
