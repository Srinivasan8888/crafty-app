import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { CrafterCard, StoreCard, StudioCard, EventCard } from "@/components/Cards";
import { EmptyState } from "@/components/EmptyState";
import { BottomNav } from "@/components/BottomNav";
import { SearchTabs } from "./_components/SearchTabs";
import Link from "next/link";

export const revalidate = 0;

type RawHit = { id: string };

const SUGGESTIONS = ["crochet", "pottery", "block printing", "candle making", "Cubbon meetup"];

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: { city: string };
  searchParams: { q?: string };
}) {
  const city = await getCityBySlug(params.city);
  if (!city) notFound();

  const q = (searchParams.q ?? "").trim();
  let crafters: any[] = [],
    stores: any[] = [],
    studios: any[] = [],
    events: any[] = [];

  if (q.length >= 2) {
    const safe = q
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .trim()
      .split(/\s+/)
      .join(" & ");

    const [cIds, sIds, stIds, eIds] = await Promise.all([
      prisma.$queryRawUnsafe<RawHit[]>(
        `SELECT id FROM "Crafter" WHERE city_id = $1 AND status = 'PUBLISHED' AND search_vector @@ to_tsquery('simple', $2) LIMIT 6`,
        city.id,
        safe,
      ),
      prisma.$queryRawUnsafe<RawHit[]>(
        `SELECT id FROM "Store"   WHERE city_id = $1 AND status = 'PUBLISHED' AND search_vector @@ to_tsquery('simple', $2) LIMIT 6`,
        city.id,
        safe,
      ),
      prisma.$queryRawUnsafe<RawHit[]>(
        `SELECT id FROM "Studio"  WHERE city_id = $1 AND status = 'PUBLISHED' AND search_vector @@ to_tsquery('simple', $2) LIMIT 6`,
        city.id,
        safe,
      ),
      prisma.$queryRawUnsafe<RawHit[]>(
        `SELECT id FROM "Event"   WHERE city_id = $1 AND status = 'PUBLISHED' AND end_at >= NOW() AND search_vector @@ to_tsquery('simple', $2) LIMIT 6`,
        city.id,
        safe,
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
  const hasQuery = q.length >= 2;

  const craftersSection =
    crafters.length > 0 ? (
      <section style={{ marginTop: 24 }}>
        <div className="sec-title-bar" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 22 }}>Crafters</h2>
          {crafters.length >= 4 && (
            <Link
              href={`/${city.slug}/crafters`}
              className="see-all"
            >
              See all crafter results →
            </Link>
          )}
        </div>
        <div className="listing-grid" style={{ padding: 0 }}>
          {crafters.slice(0, 4).map((c) => (
            <CrafterCard
              key={c.id}
              city={city.slug}
              slug={c.slug}
              name={c.name}
              tagline={c.tagline}
              profile_photo={c.profile_photo}
              categories={c.craft_categories.map((j: any) => j.category.display_name)}
              is_featured={c.is_featured}
              offers_classes={c.offers_classes}
            />
          ))}
        </div>
      </section>
    ) : null;

  const storesSection =
    stores.length > 0 ? (
      <section style={{ marginTop: 24 }}>
        <div className="sec-title-bar" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 22 }}>Stores</h2>
          {stores.length >= 4 && (
            <Link
              href={`/${city.slug}/stores`}
              className="see-all"
            >
              See all store results →
            </Link>
          )}
        </div>
        <div className="listing-grid" style={{ padding: 0 }}>
          {stores.slice(0, 4).map((s) => (
            <StoreCard
              key={s.id}
              city={city.slug}
              slug={s.slug}
              name={s.name}
              logo_photo={s.logo_photo}
              address={s.address}
              categories={s.supply_categories.map((j: any) => j.category.display_name)}
              is_claimed={s.is_claimed}
              is_online_only={s.is_online_only}
            />
          ))}
        </div>
      </section>
    ) : null;

  const studiosSection =
    studios.length > 0 ? (
      <section style={{ marginTop: 24 }}>
        <div className="sec-title-bar" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 22 }}>Learn</h2>
          {studios.length >= 4 && (
            <Link
              href={`/${city.slug}/learn`}
              className="see-all"
            >
              See all studio results →
            </Link>
          )}
        </div>
        <div className="listing-grid" style={{ padding: 0 }}>
          {studios.slice(0, 4).map((s) => (
            <StudioCard
              key={s.id}
              city={city.slug}
              slug={s.slug}
              name={s.name}
              logo_photo={s.logo_photo}
              address={s.address}
              age_group={s.age_group}
              disciplines={s.craft_disciplines.map((j: any) => j.discipline.display_name)}
            />
          ))}
        </div>
      </section>
    ) : null;

  const eventsSection =
    events.length > 0 ? (
      <section style={{ marginTop: 24 }}>
        <div className="sec-title-bar" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 22 }}>Events</h2>
          {events.length >= 4 && (
            <Link
              href={`/${city.slug}/events`}
              className="see-all"
            >
              See all event results →
            </Link>
          )}
        </div>
        <div className="listing-grid" style={{ padding: 0 }}>
          {events.slice(0, 4).map((e) => (
            <EventCard
              key={e.id}
              city={city.slug}
              slug={e.slug}
              name={e.name}
              cover_image={e.cover_image}
              start_at={e.start_at}
              venue_name={e.venue_name}
              is_free={e.is_free}
              price_amount={e.price_amount?.toString()}
              event_type={e.event_type}
            />
          ))}
        </div>
      </section>
    ) : null;

  return (
    <>
      <div className="container py-6 md:py-8">
        <nav className="breadcrumb mb-4">
          <Link href={`/${city.slug}`}>{city.display_name}</Link>
          <span className="sep">›</span>
          <span className="muted">Search</span>
        </nav>

        <header className="listing-head" style={{ paddingBottom: 8 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "2.2px",
              color: "rgb(var(--mustard-dark))",
              marginBottom: 6,
            }}
          >
            Search results
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: "-0.6px",
              lineHeight: 1.1,
            }}
          >
            {hasQuery ? (
              <>
                Results for{" "}
                <em
                  style={{
                    color: "rgb(var(--magenta))",
                    fontStyle: "italic",
                    fontWeight: 600,
                  }}
                >
                  &ldquo;{q}&rdquo;
                </em>{" "}
                in{" "}
                <em
                  style={{
                    color: "rgb(var(--forest))",
                    fontStyle: "italic",
                    fontWeight: 600,
                  }}
                >
                  {city.display_name}
                </em>
              </>
            ) : (
              <>
                Search Crafty in{" "}
                <em
                  style={{
                    color: "rgb(var(--magenta))",
                    fontStyle: "italic",
                    fontWeight: 600,
                  }}
                >
                  {city.display_name}
                </em>
              </>
            )}
          </h1>
          {hasQuery && (
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                color: "rgb(var(--muted))",
                marginTop: 6,
                fontSize: 13,
              }}
            >
              {total} matches across crafters, stores, studios, and events
            </p>
          )}
        </header>

        <form
          method="get"
          style={{
            display: "flex",
            gap: 10,
            margin: "16px 0 8px",
            maxWidth: 720,
          }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgb(var(--subtle))",
              }}
            />
            <input
              autoFocus
              name="q"
              defaultValue={q}
              placeholder={`Search ${city.display_name} — try yarn, pottery, Cubbon meetup…`}
              type="search"
              className="search-input"
              style={{ width: "100%", paddingLeft: 38 }}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        {!hasQuery ? (
          <div style={{ marginTop: 24 }}>
            <EmptyState
              title={`Search Crafty in ${city.display_name}`}
              body={`Try ${SUGGESTIONS.slice(0, 3).join(", ")} — or any maker name, neighbourhood, or supply.`}
              variant="mustard"
              glyph="✿"
            />
            <div
              style={{
                marginTop: 18,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s}
                  href={`/${city.slug}/search?q=${encodeURIComponent(s)}`}
                  className="pill"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        ) : total === 0 ? (
          <div style={{ marginTop: 24 }}>
            <EmptyState
              title={`No results for "${q}" in ${city.display_name}`}
              body={`Try a different keyword, or browse all crafters, stores and events.`}
              ctaLabel="Browse crafters"
              ctaHref={`/${city.slug}/crafters`}
              variant="forest"
              glyph="❋"
            />
            <div
              style={{
                marginTop: 18,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s}
                  href={`/${city.slug}/search?q=${encodeURIComponent(s)}`}
                  className="pill"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 18 }}>
            <SearchTabs
              counts={{
                all: total,
                crafters: crafters.length,
                stores: stores.length,
                learn: studios.length,
                events: events.length,
              }}
              craftersSlot={craftersSection}
              storesSlot={storesSection}
              studiosSlot={studiosSection}
              eventsSlot={eventsSection}
            />
          </div>
        )}
      </div>

      <BottomNav city={city.slug} active="explore" />
    </>
  );
}
