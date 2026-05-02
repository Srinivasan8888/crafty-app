import { prisma } from "@/lib/db";
import { getCities, getCityBySlug } from "@/lib/cities";
import { CitySelector } from "@/components/CitySelector";
import { DiscoveryRail } from "@/components/DiscoveryRail";
import { CrafterCard, StoreCard, StudioCard, EventCard } from "@/components/Cards";
import { BottomNav } from "@/components/BottomNav";
import { notFound } from "next/navigation";
import Link from "next/link";

export const revalidate = 60;

export async function generateStaticParams() {
  const cities = await prisma.city.findMany({ where: { is_active: true } });
  return cities.map((c) => ({ city: c.slug }));
}

export default async function CityHome({ params }: { params: { city: string } }) {
  const city = await getCityBySlug(params.city);
  if (!city) notFound();

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
      <section className="hero md:hidden">
        <h1>
          Discover India&apos;s craft community,
          <span className="magenta">one city at a time.</span>
        </h1>
        <p>
          Crafters, supply stores, studios and craft events in {city.display_name}. Free to list, free to browse.
        </p>
        <div className="ctas">
          <Link href={`/${city.slug}/crafters`} className="btn btn-primary">
            Explore crafters in {city.display_name}
          </Link>
          <Link href="/list-your-profile" className="btn btn-secondary">
            List your profile
          </Link>
        </div>
      </section>

      <section className="hero-web hidden md:block">
        <div className="row">
          <div>
            <span
              className="font-display text-xs font-bold uppercase tracking-[3px] text-mustard-dark mb-4 inline-block pb-1.5 border-b border-mustard"
            >
              Issue 01 &middot; {city.display_name}
            </span>
            <h1>
              Discover India&apos;s craft community, <em>one city at a time.</em>
            </h1>
            <p>
              Crafters, supply stores, studios and craft events in {city.display_name}. Free to list, free to browse. A
              handpicked Sunday-bazaar guide to the people making things by hand in your city.
            </p>
            <div className="ctas">
              <Link href={`/${city.slug}/crafters`} className="btn btn-primary btn-lg">
                Explore crafters in {city.display_name}
              </Link>
              <Link href="/list-your-profile" className="btn btn-secondary btn-lg">
                List your profile
              </Link>
            </div>
          </div>
          <div>
            <div
              className="relative w-full grid gap-3.5"
              style={{
                gridTemplateColumns: "1fr 1fr",
                gridTemplateRows: "220px 220px",
                minHeight: "460px",
              }}
            >
              <div
                className="bg-cover bg-center rounded-lg shadow-soft-lg border border-line-strong"
                style={{
                  backgroundImage: `url('${heroTiles[0]}')`,
                  transform: "rotate(-2deg)",
                  marginTop: "14px",
                }}
              />
              <div
                className="bg-cover bg-center rounded-lg shadow-soft-lg border border-line-strong"
                style={{
                  backgroundImage: `url('${heroTiles[1]}')`,
                  transform: "rotate(1.5deg)",
                }}
              />
              <div
                className="bg-cover bg-center rounded-lg shadow-soft-lg border border-line-strong"
                style={{
                  backgroundImage: `url('${heroTiles[2]}')`,
                  transform: "rotate(2deg)",
                  marginTop: "-8px",
                }}
              />
              <div
                className="bg-cover bg-center rounded-lg shadow-soft-lg border border-line-strong"
                style={{
                  backgroundImage: `url('${heroTiles[3]}')`,
                  transform: "rotate(-1.5deg)",
                  marginTop: "-2px",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container py-4">
        <div className="text-xs uppercase tracking-wider text-mustard-dark font-display font-semibold mb-2">
          Pick your city
        </div>
        <CitySelector cities={cities} current={city.slug} />
      </div>

      <div className="motif"></div>

      <DiscoveryRail
        title={`Crafters in ${city.display_name}`}
        seeAllHref={`/${city.slug}/crafters`}
        count={crafters.length}
        emptyText={`No crafters in ${city.display_name} yet.`}
        emptyCta={{ href: "/list-your-profile", label: "Be the first" }}
        priorityFirstCard
      >
        {crafters.map((c, idx) => (
          <div key={c.id} className="w-[240px] shrink-0">
            <CrafterCard
              city={city.slug}
              slug={c.slug}
              name={c.name}
              tagline={c.tagline}
              profile_photo={c.profile_photo}
              categories={c.craft_categories.map((j) => j.category.display_name)}
              is_featured={c.is_featured}
              offers_classes={c.offers_classes}
              priority={idx === 0}
            />
          </div>
        ))}
      </DiscoveryRail>

      <div className="motif forest"></div>

      <DiscoveryRail
        title={`Stores in ${city.display_name}`}
        seeAllHref={`/${city.slug}/stores`}
        count={stores.length}
        emptyText={`No supply stores in ${city.display_name} yet.`}
        emptyCta={{ href: "/list-your-profile", label: "Add your store" }}
      >
        {stores.map((s) => (
          <div key={s.id} className="w-[260px] shrink-0">
            <StoreCard
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

      <div className="motif magenta dots"></div>

      <DiscoveryRail
        title={`Learn in ${city.display_name}`}
        seeAllHref={`/${city.slug}/learn`}
        count={studios.length}
        emptyText={`No studios in ${city.display_name} yet.`}
        emptyCta={{ href: "/list-your-profile", label: "Add your studio" }}
      >
        {studios.map((s) => (
          <div key={s.id} className="w-[260px] shrink-0">
            <StudioCard
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

      <div className="motif forest zigzag"></div>

      <DiscoveryRail
        title={`Events in ${city.display_name}`}
        seeAllHref={`/${city.slug}/events`}
        count={events.length}
        emptyText={`No upcoming events in ${city.display_name} yet.`}
        emptyCta={{ href: "/list-your-profile", label: "Host an event" }}
      >
        {events.map((e) => (
          <div key={e.id} className="w-[300px] shrink-0">
            <EventCard
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

      <section className="hidden md:block py-16">
        <div className="container">
          <div className="text-center">
            <div className="font-display text-xs font-bold uppercase tracking-[3px] text-mustard-dark mb-2">
              Why Crafty
            </div>
            <h2 className="font-display text-4xl font-extrabold tracking-tight leading-tight mb-2">
              Built for the people <em className="not-italic text-magenta font-semibold italic">making things by hand.</em>
            </h2>
            <p className="text-ink-muted text-base max-w-xl mx-auto mb-10">
              Not a marketplace. Not a directory of stock photos. A real, city-by-city guide to Indian craft &mdash;
              written for crafters, by Crafty.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-7">
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
                Real photos, <em className="text-magenta font-semibold">real makers</em>
              </h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                Every profile is a real person. Most are within an auto&apos;s reach. No drop-shipped stock &mdash; the
                images you see are the things that turn up when you order.
              </p>
            </div>
          </div>
        </div>
      </section>

      <BottomNav city={city.slug} active="home" />
    </>
  );
}
