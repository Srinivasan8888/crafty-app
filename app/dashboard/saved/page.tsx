import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getCityBySlug } from "@/lib/cities";
import {
  CrafterCard,
  StoreCard,
  StudioCard,
  EventCard,
} from "@/components/Cards";
import { ArrowRight } from "lucide-react";

export default async function SavedPage() {
  const user = await requireUser();
  const defaultCitySlug = process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru";

  const saves = await prisma.save.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
  });

  // ── Empty state ─────────────────────────────────────────────────────
  if (saves.length === 0) {
    const city = await getCityBySlug(defaultCitySlug);
    let trendingCrafters: Awaited<ReturnType<typeof fetchTrending>> = [];
    if (city) {
      trendingCrafters = await fetchTrending(city.id);
    }

    return (
      <div>
        {/* Editorial empty-state hero */}
        <section className="relative overflow-hidden rounded-xl border border-line-strong bg-cream-2 p-8 md:p-12">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-3 top-6 text-[40px] opacity-50 text-mustard"
          >
            ❋
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute -left-2 bottom-4 text-[28px] opacity-40 text-magenta"
          >
            ✿
          </span>

          <p className="font-display text-xs font-bold uppercase tracking-[3px] text-forest">
            Nothing saved yet
          </p>

          <h1 className="mt-3 font-display text-3xl font-extrabold leading-[1.15] tracking-tight text-ink sm:text-4xl md:text-5xl">
            Start with a few{" "}
            <em className="font-semibold italic text-magenta">crafters</em>.
          </h1>

          <p className="mt-6 max-w-xl font-display text-lg italic text-muted md:text-xl">
            Tap the heart on anyone you want to remember. We&apos;ll keep
            them here for you.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={`/${city?.slug ?? defaultCitySlug}/crafters`}
              className="btn btn-primary btn-lg"
            >
              Browse crafters in{" "}
              <em className="font-semibold italic">
                {city?.display_name ?? "Bengaluru"}
              </em>{" "}
              <ArrowRight size={16} />
            </Link>
          </div>

          <p className="mt-5 font-display text-sm italic text-muted">
            or wander through{" "}
            <Link
              href={`/${city?.slug ?? defaultCitySlug}/stores`}
              className="not-italic font-semibold text-forest underline decoration-mustard decoration-[1.5px] underline-offset-4 hover:decoration-2"
            >
              stores
            </Link>
            {" / "}
            <Link
              href={`/${city?.slug ?? defaultCitySlug}/learn`}
              className="not-italic font-semibold text-forest underline decoration-mustard decoration-[1.5px] underline-offset-4 hover:decoration-2"
            >
              studios
            </Link>
            {" / "}
            <Link
              href={`/${city?.slug ?? defaultCitySlug}/events`}
              className="not-italic font-semibold text-forest underline decoration-mustard decoration-[1.5px] underline-offset-4 hover:decoration-2"
            >
              events
            </Link>
            .
          </p>
        </section>

        {/* What others are saving */}
        {trendingCrafters.length > 0 && city && (
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[3px] text-forest">
                  What others are saving
                </p>
                <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                  Trending this week in{" "}
                  <em className="font-semibold italic text-magenta">
                    {city.display_name}
                  </em>
                </h2>
              </div>
              <Link
                href={`/${city.slug}/crafters`}
                className="hidden text-sm font-semibold text-forest hover:underline sm:inline-flex sm:items-center sm:gap-1"
              >
                See all <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trendingCrafters.map((c) => (
                <CrafterCard
                  key={c.id}
                  id={c.id}
                  city={city.slug}
                  slug={c.slug}
                  name={c.name}
                  tagline={c.tagline}
                  profile_photo={c.profile_photo}
                  categories={c.craft_categories.map(
                    (j) => j.category.display_name,
                  )}
                  is_featured={c.is_featured}
                  offers_classes={c.offers_classes}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ── Populated state ─────────────────────────────────────────────────
  // Hydrate per type, preserving save order (most recent first).
  const savedCrafterIds = saves
    .filter((s) => s.entity_type === "CRAFTER")
    .map((s) => s.entity_id);
  const savedStoreIds = saves
    .filter((s) => s.entity_type === "STORE")
    .map((s) => s.entity_id);
  const savedStudioIds = saves
    .filter((s) => s.entity_type === "STUDIO")
    .map((s) => s.entity_id);
  const savedEventIds = saves
    .filter((s) => s.entity_type === "EVENT")
    .map((s) => s.entity_id);

  const [crafterRows, storeRows, studioRows, eventRows] = await Promise.all([
    savedCrafterIds.length
      ? prisma.crafter.findMany({
          where: { id: { in: savedCrafterIds }, status: "PUBLISHED" },
          include: {
            city: true,
            craft_categories: {
              select: { category: { select: { display_name: true } } },
            },
          },
        })
      : Promise.resolve([]),
    savedStoreIds.length
      ? prisma.store.findMany({
          where: { id: { in: savedStoreIds }, status: "PUBLISHED" },
          include: {
            city: true,
            supply_categories: {
              select: { category: { select: { display_name: true } } },
            },
          },
        })
      : Promise.resolve([]),
    savedStudioIds.length
      ? prisma.studio.findMany({
          where: { id: { in: savedStudioIds }, status: "PUBLISHED" },
          include: {
            city: true,
            craft_disciplines: {
              select: { discipline: { select: { display_name: true } } },
            },
          },
        })
      : Promise.resolve([]),
    savedEventIds.length
      ? prisma.event.findMany({
          where: { id: { in: savedEventIds }, status: "PUBLISHED" },
          include: { city: true },
        })
      : Promise.resolve([]),
  ]);

  // Reorder hydrated rows to match save-recency order.
  const orderBy = <T extends { id: string }>(rows: T[], ids: string[]) => {
    const map = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => map.get(id)).filter((r): r is T => Boolean(r));
  };
  const crafters = orderBy(crafterRows, savedCrafterIds);
  const stores = orderBy(storeRows, savedStoreIds);
  const studios = orderBy(studioRows, savedStudioIds);
  const events = orderBy(eventRows, savedEventIds);

  const totalVisible =
    crafters.length + stores.length + studios.length + events.length;
  const countLabel = totalVisible === 1 ? "1 saved" : `${totalVisible} saved`;

  return (
    <div>
      {/* Eyebrow + title */}
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-[3px] text-forest">
          Your collection &middot; {countLabel}
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Things you&apos;ve{" "}
          <em className="font-semibold italic text-magenta">saved</em>.
        </h1>
      </div>

      {crafters.length > 0 && (
        <SectionHeading
          eyebrow="Makers"
          first="Crafters"
          accent="you've saved"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {crafters.map((c) => (
              <CrafterCard
                key={c.id}
                id={c.id}
                city={c.city.slug}
                slug={c.slug}
                name={c.name}
                tagline={c.tagline}
                profile_photo={c.profile_photo}
                categories={c.craft_categories.map(
                  (j) => j.category.display_name,
                )}
                is_featured={c.is_featured}
                offers_classes={c.offers_classes}
              />
            ))}
          </div>
        </SectionHeading>
      )}

      {stores.length > 0 && (
        <SectionHeading
          eyebrow="Shops"
          first="Stores"
          accent="you've saved"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stores.map((s) => (
              <StoreCard
                key={s.id}
                id={s.id}
                city={s.city.slug}
                slug={s.slug}
                name={s.name}
                logo_photo={s.logo_photo}
                address={s.address}
                categories={s.supply_categories.map(
                  (j) => j.category.display_name,
                )}
                is_online_only={s.is_online_only}
                is_claimed={s.is_claimed}
              />
            ))}
          </div>
        </SectionHeading>
      )}

      {studios.length > 0 && (
        <SectionHeading
          eyebrow="Learn"
          first="Studios"
          accent="you've saved"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {studios.map((s) => (
              <StudioCard
                key={s.id}
                id={s.id}
                city={s.city.slug}
                slug={s.slug}
                name={s.name}
                logo_photo={s.logo_photo}
                address={s.address}
                age_group={s.age_group}
                disciplines={s.craft_disciplines.map(
                  (j) => j.discipline.display_name,
                )}
              />
            ))}
          </div>
        </SectionHeading>
      )}

      {events.length > 0 && (
        <SectionHeading
          eyebrow="Happenings"
          first="Events"
          accent="you've saved"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard
                key={e.id}
                id={e.id}
                city={e.city.slug}
                slug={e.slug}
                name={e.name}
                cover_image={e.cover_image}
                start_at={e.start_at}
                venue_name={e.venue_name}
                is_free={e.is_free}
                price_amount={
                  e.price_amount != null ? e.price_amount.toString() : null
                }
                event_type={e.event_type}
              />
            ))}
          </div>
        </SectionHeading>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

async function fetchTrending(cityId: string) {
  return prisma.crafter.findMany({
    where: { city_id: cityId, status: "PUBLISHED" },
    take: 4,
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
  });
}

function SectionHeading({
  eyebrow,
  first,
  accent,
  children,
}: {
  eyebrow: string;
  first: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-[3px] text-forest">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          {first}{" "}
          <em className="font-semibold italic text-magenta">{accent}</em>
        </h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
