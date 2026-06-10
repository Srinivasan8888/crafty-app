import { prisma } from "@/lib/db";
import { getCities, getCityBySlug } from "@/lib/cities";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { CrafterCard, StoreCard, StudioCard, EventCard } from "@/components/Cards";
import { EmptyState } from "@/components/EmptyState";
import { BottomNav } from "@/components/BottomNav";
import { CitySelector } from "@/components/CitySelector";
import { SearchTabs } from "./_components/SearchTabs";
import Link from "next/link";

export const revalidate = 0;

type RawHit = { id: string };

const SUGGESTIONS = ["crochet", "pottery", "block printing", "candle making", "Cubbon meetup"];

type CitySummary = { id: string; slug: string; display_name: string };

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: { city: string };
  searchParams: { q?: string; cities?: string };
}) {
  const cityFromUrl = await getCityBySlug(params.city);
  if (!cityFromUrl) notFound();

  const allCities = await getCities();

  // V3 — multi-city search.
  //
  // When ?cities=a,b,c is present we run FTS across the listed cities and
  // group results by city in the UI. The URL's [city] segment is always
  // included so the breadcrumb / "default" city remains coherent.
  const requestedSlugs = (searchParams.cities ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isMultiMode = requestedSlugs.length > 0;
  const selectedCities: CitySummary[] = (() => {
    if (!isMultiMode) return [cityFromUrl];
    const map = new Map(allCities.map((c) => [c.slug, c]));
    const out: CitySummary[] = [];
    // URL's city is always included.
    out.push(cityFromUrl);
    for (const slug of requestedSlugs) {
      if (slug === cityFromUrl.slug) continue;
      const c = map.get(slug);
      if (c) out.push(c);
    }
    return out;
  })();
  const selectedIds = selectedCities.map((c) => c.id);

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

    // Parameterized IN-lists via ANY($1::text[]) keeps the prepared-statement
    // shape stable across single-city and multi-city queries. Limit scales
    // up gently when multiple cities are selected.
    const limit = isMultiMode ? Math.max(12, selectedIds.length * 6) : 6;
    const [cIds, sIds, stIds, eIds] = await Promise.all([
      prisma.$queryRawUnsafe<RawHit[]>(
        `SELECT id FROM "Crafter" WHERE city_id = ANY($1::text[]) AND status = 'PUBLISHED' AND search_vector @@ to_tsquery('simple', $2) LIMIT ${limit}`,
        selectedIds,
        safe,
      ),
      prisma.$queryRawUnsafe<RawHit[]>(
        `SELECT id FROM "Store"   WHERE city_id = ANY($1::text[]) AND status = 'PUBLISHED' AND search_vector @@ to_tsquery('simple', $2) LIMIT ${limit}`,
        selectedIds,
        safe,
      ),
      prisma.$queryRawUnsafe<RawHit[]>(
        `SELECT id FROM "Studio"  WHERE city_id = ANY($1::text[]) AND status = 'PUBLISHED' AND search_vector @@ to_tsquery('simple', $2) LIMIT ${limit}`,
        selectedIds,
        safe,
      ),
      prisma.$queryRawUnsafe<RawHit[]>(
        `SELECT id FROM "Event"   WHERE city_id = ANY($1::text[]) AND status = 'PUBLISHED' AND end_at >= NOW() AND search_vector @@ to_tsquery('simple', $2) LIMIT ${limit}`,
        selectedIds,
        safe,
      ),
    ]);

    [crafters, stores, studios, events] = await Promise.all([
      prisma.crafter.findMany({
        where: { id: { in: cIds.map((r) => r.id) } },
        include: { craft_categories: { include: { category: true } }, city: { select: { slug: true, display_name: true, id: true } } },
      }),
      prisma.store.findMany({
        where: { id: { in: sIds.map((r) => r.id) } },
        include: { supply_categories: { include: { category: true } }, city: { select: { slug: true, display_name: true, id: true } } },
      }),
      prisma.studio.findMany({
        where: { id: { in: stIds.map((r) => r.id) } },
        include: { craft_disciplines: { include: { discipline: true } }, city: { select: { slug: true, display_name: true, id: true } } },
      }),
      prisma.event.findMany({
        where: { id: { in: eIds.map((r) => r.id) } },
        include: { city: { select: { slug: true, display_name: true, id: true } } },
      }),
    ]);
  }

  const total = crafters.length + stores.length + studios.length + events.length;
  const hasQuery = q.length >= 2;
  // V2.0 — let buyers subscribe to this search; cron emails new matches daily.
  const { SaveSearchButton } = await import("@/components/SaveSearchButton");
  const SubscribeBar =
    hasQuery && total > 0 ? (
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md bg-canvas-sunken px-3 py-2 text-sm">
        <span className="text-ink-muted">Want to know when new matches appear?</span>
        <SaveSearchButton cityId={cityFromUrl.id} query={q} entityType="CRAFTER" />
      </div>
    ) : null;

  // Group items by city for multi-mode. In single-mode we keep the original
  // section-per-entity layout for backward compatibility.
  const renderEntitySection = (
    label: string,
    items: any[],
    renderCard: (item: any, citySlug: string) => React.ReactNode,
    seeAllPath: (citySlug: string) => string,
    seeAllLabel: string,
  ) => {
    if (items.length === 0) return null;

    if (!isMultiMode) {
      const c = cityFromUrl;
      return (
        <section style={{ marginTop: 24 }}>
          <div className="sec-title-bar" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 22 }}>{label}</h2>
            {items.length >= 4 && (
              <Link href={seeAllPath(c.slug)} className="see-all">
                See all {seeAllLabel} →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.slice(0, 4).map((it) => renderCard(it, c.slug))}
          </div>
        </section>
      );
    }

    // Multi-mode: per-city subgroups.
    type Bucket = { city: { slug: string; display_name: string }; rows: any[] };
    const byCity = new Map<string, Bucket>();
    for (const it of items) {
      const slug = it.city?.slug ?? cityFromUrl.slug;
      const dn = it.city?.display_name ?? cityFromUrl.display_name;
      const bucket: Bucket = byCity.get(slug) ?? { city: { slug, display_name: dn }, rows: [] as any[] };
      bucket.rows.push(it);
      byCity.set(slug, bucket);
    }
    return (
      <section style={{ marginTop: 24 }}>
        <div className="sec-title-bar" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 22 }}>{label}</h2>
        </div>
        <div className="flex flex-col gap-8">
          {selectedCities
            .map((c) => byCity.get(c.slug))
            .filter(Boolean)
            .map((bucket) => (
              <div key={bucket!.city.slug}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h3 className="font-display text-base font-semibold tracking-tight text-ink">
                    {label} in <em className="text-forest italic font-semibold">{bucket!.city.display_name}</em>
                    <span className="ml-2 text-sm font-normal text-ink-muted">({bucket!.rows.length})</span>
                  </h3>
                  {bucket!.rows.length >= 4 && (
                    <Link href={seeAllPath(bucket!.city.slug)} className="see-all">
                      See all in {bucket!.city.display_name} →
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {bucket!.rows.slice(0, 4).map((it) => renderCard(it, bucket!.city.slug))}
                </div>
              </div>
            ))}
        </div>
      </section>
    );
  };

  const craftersSection = renderEntitySection(
    "Crafters",
    crafters,
    (c, citySlug) => (
      <CrafterCard
        key={c.id}
        id={c.id}
        city={citySlug}
        slug={c.slug}
        name={c.name}
        tagline={c.tagline}
        profile_photo={c.profile_photo}
        categories={c.craft_categories.map((j: any) => j.category.display_name)}
        is_featured={c.is_featured}
        offers_classes={c.offers_classes}
      />
    ),
    (citySlug) => `/${citySlug}/crafters`,
    "crafter results",
  );

  const storesSection = renderEntitySection(
    "Stores",
    stores,
    (s, citySlug) => (
      <StoreCard
        key={s.id}
        id={s.id}
        city={citySlug}
        slug={s.slug}
        name={s.name}
        logo_photo={s.logo_photo}
        address={s.address}
        categories={s.supply_categories.map((j: any) => j.category.display_name)}
        is_claimed={s.is_claimed}
        is_online_only={s.is_online_only}
      />
    ),
    (citySlug) => `/${citySlug}/stores`,
    "store results",
  );

  const studiosSection = renderEntitySection(
    "Learn",
    studios,
    (s, citySlug) => (
      <StudioCard
        key={s.id}
        id={s.id}
        city={citySlug}
        slug={s.slug}
        name={s.name}
        logo_photo={s.logo_photo}
        address={s.address}
        age_group={s.age_group}
        disciplines={s.craft_disciplines.map((j: any) => j.discipline.display_name)}
      />
    ),
    (citySlug) => `/${citySlug}/learn`,
    "studio results",
  );

  const eventsSection = renderEntitySection(
    "Events",
    events,
    (e, citySlug) => (
      <EventCard
        key={e.id}
        id={e.id}
        city={citySlug}
        slug={e.slug}
        name={e.name}
        cover_image={e.cover_image}
        start_at={e.start_at}
        venue_name={e.venue_name}
        is_free={e.is_free}
        price_amount={e.price_amount?.toString()}
        event_type={e.event_type}
      />
    ),
    (citySlug) => `/${citySlug}/events`,
    "event results",
  );

  // Preserve current query when navigating with the multi-select. The form
  // below also includes a hidden cities input so re-submitting the keyword
  // doesn't lose the selection.
  const citiesParamValue = isMultiMode ? selectedCities.map((c) => c.slug).join(",") : "";

  return (
    <>
      <div className="container py-6 md:py-8">
        <nav className="breadcrumb mb-4">
          <Link href={`/${cityFromUrl.slug}`}>{cityFromUrl.display_name}</Link>
          <span className="sep">›</span>
          <span className="muted">Search</span>
        </nav>

        <header className="listing-head" style={{ paddingBottom: 8 }}>
          <div
            className="text-forest"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "2.2px",
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
                <em className="text-magenta" style={{ fontStyle: "italic", fontWeight: 600 }}>
                  &ldquo;{q}&rdquo;
                </em>{" "}
                {isMultiMode ? (
                  <>
                    across{" "}
                    <em className="text-forest" style={{ fontStyle: "italic", fontWeight: 600 }}>
                      {selectedCities.length} cities
                    </em>
                  </>
                ) : (
                  <>
                    in{" "}
                    <em className="text-forest" style={{ fontStyle: "italic", fontWeight: 600 }}>
                      {cityFromUrl.display_name}
                    </em>
                  </>
                )}
              </>
            ) : (
              <>
                Search Crafty in{" "}
                <em className="text-magenta" style={{ fontStyle: "italic", fontWeight: 600 }}>
                  {cityFromUrl.display_name}
                </em>
              </>
            )}
          </h1>
          {hasQuery && (
            <p
              className="text-muted"
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                marginTop: 6,
                fontSize: 13,
              }}
            >
              {total} matches across crafters, stores, studios, and events
              {isMultiMode && (
                <>
                  {" "}— {selectedCities.map((c) => c.display_name).join(", ")}
                </>
              )}
            </p>
          )}
          {SubscribeBar}
        </header>

        <form
          method="get"
          role="search"
          aria-label="Search crafters, stores, events"
          style={{ display: "flex", gap: 10, margin: "16px 0 8px", maxWidth: 720 }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              aria-hidden="true"
              className="text-subtle"
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              name="q"
              defaultValue={q}
              placeholder={`Search ${cityFromUrl.display_name} — try yarn, pottery, Cubbon meetup…`}
              type="search"
              aria-label="Search crafters, stores, events"
              className="search-input w-full"
              style={{ paddingLeft: 38 }}
            />
          </div>
          {/* Preserve the cities filter when re-submitting the keyword form. */}
          {isMultiMode && <input type="hidden" name="cities" value={citiesParamValue} />}
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        <div className="mb-2 mt-1">
          <CitySelector
            cities={allCities}
            current={cityFromUrl.slug}
            multi
            currentQuery={q}
            initiallySelected={selectedCities.map((c) => c.slug)}
            showAddMyCity={false}
          />
        </div>

        {!hasQuery ? (
          <div style={{ marginTop: 24 }}>
            <EmptyState
              title={`Search Crafty in ${cityFromUrl.display_name}`}
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
                  href={`/${cityFromUrl.slug}/search?q=${encodeURIComponent(s)}`}
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
              title={`No results for "${q}"${isMultiMode ? " across the selected cities" : ` in ${cityFromUrl.display_name}`}`}
              body={`Try a different keyword, or browse all crafters, stores and events.`}
              ctaLabel="Browse crafters"
              ctaHref={`/${cityFromUrl.slug}/crafters`}
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
                  href={`/${cityFromUrl.slug}/search?q=${encodeURIComponent(s)}`}
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

      <BottomNav city={cityFromUrl.slug} active="explore" />
    </>
  );
}
