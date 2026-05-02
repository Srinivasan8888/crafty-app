import { prisma } from "@/lib/db";
import { getCities, getCityBySlug } from "@/lib/cities";
import { CitySelector } from "@/components/CitySelector";
import { DiscoveryRail } from "@/components/DiscoveryRail";
import { CrafterCard, StoreCard, StudioCard, EventCard } from "@/components/Cards";
import { notFound } from "next/navigation";
import Link from "next/link";

// Issue 4.3: ISR with on-demand revalidation; 60s safety net.
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

  // Limit fields via `select` to only what the cards render.
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

  return (
    <>
      {/* Hero */}
      <section className="container py-10 sm:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Discover India&apos;s craft community,
            <br />
            <span className="text-accent">one city at a time.</span>
          </h1>
          <p className="mt-4 text-base text-ink-muted sm:text-lg">
            Crafters, supply stores, studios and craft events in {city.display_name}.
            Free to list, free to browse.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/${city.slug}/crafters`} className="btn btn-primary">
              Explore crafters in {city.display_name}
            </Link>
            <Link href="/list-your-profile" className="btn">List your profile</Link>
          </div>
        </div>
      </section>

      {/* City selector */}
      <div className="container">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Pick your city</h2>
        <CitySelector cities={cities} current={city.slug} />
      </div>

      {/* Discovery rails */}
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
    </>
  );
}
