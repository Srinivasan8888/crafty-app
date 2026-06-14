import { prisma } from "@/lib/db";
import { getCities, getCityBySlug } from "@/lib/cities";
import { CitySelector } from "@/components/CitySelector";
import { DiscoveryRail } from "@/components/DiscoveryRail";
import { CrafterCard, StoreCard, StudioCard, EventCard } from "@/components/Cards";
import { CommunityMoment, FALLBACK_COMMUNITY_MOMENT } from "@/components/CommunityMoment";
import { RequestCityBanner } from "@/components/RequestCityBanner";
import { readGeoHint } from "@/lib/geo";
import { BottomNav } from "@/components/BottomNav";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const city = await getCityBySlug(params.city);
  const cityName = city?.display_name ?? params.city;
  const title = `Crafty in ${cityName}: crafters, stores, studios & events`;
  const description = `Discover local makers, supply stores, craft studios and events across ${cityName}. Handmade, found near you.`;
  return {
    title,
    description,
    alternates: { canonical: `/${params.city}` },
    openGraph: { title, description, type: "website", images: ["/opengraph-image"] },
  };
}

export const revalidate = 60;

export async function generateStaticParams() {
  const cities = await prisma.city.findMany({ where: { is_active: true } });
  return cities.map((c) => ({ city: c.slug }));
}

export default async function CityHome({ params }: { params: { city: string } }) {
  const city = await getCityBySlug(params.city);
  if (!city) notFound();

  const tHero = await getTranslations("hero");

  // V1.5 — if the visitor's IP suggests they're in India but in a city we
  // don't serve yet, surface a request-banner so demand can accumulate.
  const geo = readGeoHint();
  const showRequestBanner =
    geo.isLikelyIN && geo.matchedCitySlug === null && geo.city !== null;

  const cities = await getCities();
  const where = { city_id: city.id, status: "PUBLISHED" as const };

  const [crafters, stores, studios, events] = await Promise.all([
    prisma.crafter.findMany({
      where,
      take: 8,
      orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        profile_photo: true,
        is_featured: true,
        offers_classes: true,
        craft_categories: {
          select: { category: { select: { display_name: true } } },
        },
      },
    }),
    prisma.store.findMany({
      where,
      take: 8,
      orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        logo_photo: true,
        address: true,
        is_online_only: true,
        is_claimed: true,
        supply_categories: {
          select: { category: { select: { display_name: true } } },
        },
      },
    }),
    prisma.studio.findMany({
      where,
      take: 8,
      orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        logo_photo: true,
        address: true,
        age_group: true,
        craft_disciplines: {
          select: { discipline: { select: { display_name: true } } },
        },
      },
    }),
    prisma.event.findMany({
      where: { city_id: city.id, status: "PUBLISHED", end_at: { gte: new Date() } },
      take: 8,
      orderBy: { start_at: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        cover_image: true,
        start_at: true,
        venue_name: true,
        is_free: true,
        price_amount: true,
        event_type: true,
      },
    }),
  ]);

  const collageImages = crafters
    .filter((c) => c.profile_photo)
    .slice(0, 4)
    .map((c) => c.profile_photo as string);
  const fallbackImages = [
    "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=75&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=600&q=75&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1577985043696-8bd54d9f093f?w=600&q=75&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=600&q=75&fit=crop&auto=format",
  ];
  const heroTiles = [0, 1, 2, 3].map((i) => collageImages[i] || fallbackImages[i]);

  return (
    <>
      <section className="hero md:py-16 lg:py-24 md:text-left">
        <div className="md:grid md:grid-cols-[1.2fr_1fr] md:items-center md:gap-16 md:max-w-[var(--container-max)] md:mx-auto md:px-[var(--container-pad)]">
          <div>
            <span className="inline-block font-display text-xs font-bold uppercase tracking-[3px] text-forest mb-4 pb-1.5 border-b border-mustard">
              {tHero("eyebrow")} &middot; {city.display_name}
            </span>
            <h1 className="md:text-[56px] md:leading-[1.02] md:tracking-[-2px]">
              {tHero("headline")}{" "}
              <em className="text-magenta italic font-semibold block md:inline">
                {tHero("headlineEm")}
              </em>
            </h1>
            <p className="md:text-[17px] md:max-w-[520px] md:mt-6">
              {tHero("subtitleA")} {city.display_name}. {tHero("subtitleB")}
              <span className="hidden md:inline"> {tHero("subtitleExtended")}</span>
            </p>
            <div className="ctas md:justify-start">
              <Link href={`/${city.slug}/crafters`} className="btn btn-primary md:btn-lg">
                {tHero("exploreCta")} {city.display_name}
              </Link>
              <Link href="/list-your-profile" className="btn btn-secondary md:btn-lg">
                {tHero("listCta")}
              </Link>
            </div>
          </div>
          <div className="md:hidden mt-6 relative aspect-[4/3] rounded-lg overflow-hidden border border-line-strong shadow-soft bg-cream-2">
            <Image
              src={heroTiles[0]}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              priority
              fetchPriority="high"
            />
          </div>
          <div className="hidden md:block">
            <div
              className="relative w-full grid gap-3.5"
              style={{
                gridTemplateColumns: "1fr 1fr",
                gridTemplateRows: "220px 220px",
                minHeight: "460px",
              }}
            >
              <div
                className="relative rounded-lg shadow-soft-lg border border-line-strong overflow-hidden bg-cream-2"
                style={{ transform: "rotate(-2deg)", marginTop: "14px" }}
              >
                <Image
                  src={heroTiles[0]}
                  alt=""
                  fill
                  sizes="(min-width:768px) 25vw, 50vw"
                  className="object-cover"
                  priority
                  fetchPriority="high"
                />
              </div>
              <div
                className="relative rounded-lg shadow-soft-lg border border-line-strong overflow-hidden bg-cream-2"
                style={{ transform: "rotate(1.5deg)" }}
              >
                <Image
                  src={heroTiles[1]}
                  alt=""
                  fill
                  sizes="(min-width:768px) 25vw, 50vw"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
              <div
                className="relative rounded-lg shadow-soft-lg border border-line-strong overflow-hidden bg-cream-2"
                style={{ transform: "rotate(2deg)", marginTop: "-8px" }}
              >
                <Image
                  src={heroTiles[2]}
                  alt=""
                  fill
                  sizes="(min-width:768px) 25vw, 50vw"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
              <div
                className="relative rounded-lg shadow-soft-lg border border-line-strong overflow-hidden bg-cream-2"
                style={{ transform: "rotate(-1.5deg)", marginTop: "-2px" }}
              >
                <Image
                  src={heroTiles[3]}
                  alt=""
                  fill
                  sizes="(min-width:768px) 25vw, 50vw"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-4">
        <div className="text-xs uppercase tracking-wider text-forest font-display font-semibold mb-2">
          {tHero("pickCity")}
        </div>
        <CitySelector cities={cities} current={city.slug} />
      </div>

      <div className="motif" aria-hidden="true"></div>

      <DiscoveryRail
        title={`Crafters in ${city.display_name}`}
        seeAllHref={`/${city.slug}/crafters`}
        count={crafters.length}
        emptyText={`No crafters in ${city.display_name} yet.`}
        emptyCta={{ href: "/list-your-profile", label: "Be the first" }}
      >
        {crafters.map((c, idx) => (
          <div key={c.id} className="shrink-0" style={{ width: "var(--rail-card-w)" }}>
            <CrafterCard
              id={c.id}
              city={city.slug}
              slug={c.slug}
              name={c.name}
              tagline={c.tagline}
              profile_photo={c.profile_photo}
              categories={c.craft_categories.map((j) => j.category.display_name)}
              is_featured={c.is_featured}
              offers_classes={c.offers_classes}
              priority={false}
            />
          </div>
        ))}
      </DiscoveryRail>

      <div className="motif forest" aria-hidden="true"></div>

      <DiscoveryRail
        title={`Stores in ${city.display_name}`}
        seeAllHref={`/${city.slug}/stores`}
        count={stores.length}
        emptyText={`No supply stores in ${city.display_name} yet.`}
        emptyCta={{ href: "/list-your-profile", label: "Add your store" }}
      >
        {stores.map((s) => (
          <div key={s.id} className="shrink-0" style={{ width: "var(--rail-card-w)" }}>
            <StoreCard
              id={s.id}
              city={city.slug}
              slug={s.slug}
              name={s.name}
              logo_photo={s.logo_photo}
              address={s.address}
              categories={s.supply_categories.map((j) => j.category.display_name)}
              is_online_only={s.is_online_only}
              is_claimed={s.is_claimed}
            />
          </div>
        ))}
      </DiscoveryRail>

      <div className="motif magenta dots" aria-hidden="true"></div>

      {/* PRD §7.1 — community moment between rails 2 and 3.
          V1.5: per-city moment from the City.community_moment JSON field,
          falling back to the generic Crafty moment. */}
      {(() => {
        const m = (city.community_moment ?? null) as { photoUrl?: string; caption?: string } | null;
        const photoUrl = m?.photoUrl ?? FALLBACK_COMMUNITY_MOMENT.photoUrl;
        const caption = m?.caption ?? FALLBACK_COMMUNITY_MOMENT.caption;
        return <CommunityMoment photoUrl={photoUrl} caption={caption} />;
      })()}

      {/* Always rendered so the header's "Add my city" anchor (#request-city)
          always resolves. Copy adapts when geo suggests an unserved city. */}
      <RequestCityBanner
        defaultCity={showRequestBanner ? geo.city ?? "" : ""}
        headline={showRequestBanner ? "Crafty isn't in your city yet." : "Don't see your city on Crafty?"}
        dismissable={false}
      />

      <DiscoveryRail
        title={`Learn in ${city.display_name}`}
        seeAllHref={`/${city.slug}/learn`}
        count={studios.length}
        emptyText={`No studios in ${city.display_name} yet.`}
        emptyCta={{ href: "/list-your-profile", label: "Add your studio" }}
      >
        {studios.map((s) => (
          <div key={s.id} className="shrink-0" style={{ width: "var(--rail-card-w)" }}>
            <StudioCard
              id={s.id}
              city={city.slug}
              slug={s.slug}
              name={s.name}
              logo_photo={s.logo_photo}
              address={s.address}
              age_group={s.age_group}
              disciplines={s.craft_disciplines.map((j) => j.discipline.display_name)}
            />
          </div>
        ))}
      </DiscoveryRail>

      <div className="motif forest zigzag" aria-hidden="true"></div>

      <DiscoveryRail
        title={`Events in ${city.display_name}`}
        seeAllHref={`/${city.slug}/events`}
        count={events.length}
        emptyText={`No upcoming events in ${city.display_name} yet.`}
        emptyCta={{ href: "/list-your-profile", label: "Host an event" }}
      >
        {events.map((e) => (
          <div key={e.id} className="shrink-0" style={{ width: "var(--rail-card-w-wide)" }}>
            <EventCard
              id={e.id}
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
          </div>
        ))}
      </DiscoveryRail>

      <section className="py-12 md:py-16">
        <div className="container">
          <div className="text-center">
            <div className="font-display text-xs font-bold uppercase tracking-[3px] text-forest mb-2">
              Why Crafty
            </div>
            <h2 className="font-display text-4xl font-extrabold tracking-tight leading-tight mb-2">
              Built for the people <em className="not-italic text-magenta font-semibold">making things by hand.</em>
            </h2>
            <p className="text-ink-muted text-base max-w-xl mx-auto mb-10">
              Not a marketplace. Not a directory of stock photos. A real, city-by-city guide to Indian craft &mdash;
              written for crafters, by Crafty.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-7">
            <div className="bg-cream border border-line-strong rounded-lg p-8 shadow-soft">
              <div className="text-3xl text-mustard mb-4 leading-none">!</div>
              <h3 className="font-display text-xl font-bold leading-tight tracking-tight mb-2.5 text-ink">
                Always <em className="text-magenta font-semibold">free</em> to list
              </h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                Always free for crafters and supply stores. We don&apos;t take a cut. No commissions, no ads, no algorithm
                pushing you down. Just a clean profile your customers can find.
              </p>
            </div>
            <div className="bg-cream border border-line-strong rounded-lg p-8 shadow-soft">
              <div className="text-3xl text-mustard mb-4 leading-none">☀</div>
              <h3 className="font-display text-xl font-bold leading-tight tracking-tight mb-2.5 text-ink">
                City-localized, <em className="text-magenta font-semibold">not generic</em>
              </h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                We start with your city, not a global feed. Discover what&apos;s near you. We know the neighbourhoods, and
                so do the customers searching for you.
              </p>
            </div>
            <div className="bg-cream border border-line-strong rounded-lg p-8 shadow-soft">
              <div className="text-3xl text-mustard mb-4 leading-none">❋</div>
              <h3 className="font-display text-xl font-bold leading-tight tracking-tight mb-2.5 text-ink">
                Built for <em className="text-magenta font-semibold">real photos</em>
              </h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                Real owner photos roll in as crafters claim their listings &mdash; an early peek at how it&apos;ll
                look once your friends down the lane are on here too.
              </p>
            </div>
          </div>
        </div>
      </section>

      <BottomNav city={city.slug} active="home" />
    </>
  );
}
