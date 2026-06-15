import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getCityBySlug } from "@/lib/cities";
import { ActivityStrip } from "@/components/ActivityStrip";
import { CrafterCard } from "@/components/Cards";
import { SafeImage } from "@/components/SafeImage";
import { EventTracker } from "@/components/EventTracker";
import { ForYouSection } from "@/components/ForYouSection";
import { ArrowRight, Pencil, Plus } from "lucide-react";

export default async function DashboardOverview() {
  const user = await requireUser();
  const defaultCitySlug = process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru";

  const [crafters, stores, studios, events] = await Promise.all([
    prisma.crafter.findMany({
      where: { owner_user_id: user.id },
      include: { city: true },
      orderBy: { created_at: "desc" },
    }),
    prisma.store.findMany({
      where: { owner_user_id: user.id },
      include: { city: true },
      orderBy: { created_at: "desc" },
    }),
    prisma.studio.findMany({
      where: { owner_user_id: user.id },
      include: { city: true },
      orderBy: { created_at: "desc" },
    }),
    prisma.event.findMany({
      where: { organizer_user_id: user.id },
      orderBy: { start_at: "desc" },
    }),
  ]);

  const totalListings =
    crafters.length + stores.length + studios.length + events.length;
  const isEmpty = totalListings === 0;
  const firstName =
    user.display_name?.split(" ")[0] ?? user.email.split("@")[0] ?? "friend";

  // ── Empty state ─────────────────────────────────────────────────────
  if (isEmpty) {
    const city = await getCityBySlug(defaultCitySlug);
    let trendingCrafters: Awaited<ReturnType<typeof fetchTrending>> = [];
    if (city) {
      trendingCrafters = await fetchTrending(city.id);
    }

    return (
      <div>
        <EventTracker
          name="signup_completed"
          props={{ role: user.role }}
          dedupKey={`signup_completed:${user.id}`}
          includeSignupSource
        />
        {/* Editorial hero */}
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
            Issue 01 &middot;{" "}
            {(city?.display_name ?? "Bengaluru").toString()}
          </p>

          <h1 className="mt-3 font-display text-3xl font-extrabold leading-[1.15] tracking-tight text-ink sm:text-4xl md:text-5xl">
            Welcome to Crafty,{" "}
            <em className="font-semibold italic text-magenta">
              {firstName}
            </em>
            .
          </h1>

          <p className="mt-6 max-w-xl font-display text-lg italic text-muted md:text-xl">
            Let&apos;s get your craft discovered. About five minutes to set
            up &mdash; goes live immediately.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/crafter/new"
              className="btn btn-primary btn-lg"
            >
              Create your crafter profile <ArrowRight size={16} />
            </Link>
          </div>

          <p className="mt-5 font-display text-sm italic text-muted">
            or list a{" "}
            <Link
              href="/dashboard/store/new"
              className="not-italic font-semibold text-forest underline decoration-mustard decoration-[1.5px] underline-offset-4 hover:decoration-2"
            >
              store
            </Link>
            {" / "}
            <Link
              href="/dashboard/studio/new"
              className="not-italic font-semibold text-forest underline decoration-mustard decoration-[1.5px] underline-offset-4 hover:decoration-2"
            >
              studio
            </Link>
            {" / "}
            <Link
              href="/dashboard/events/new"
              className="not-italic font-semibold text-forest underline decoration-mustard decoration-[1.5px] underline-offset-4 hover:decoration-2"
            >
              event
            </Link>
            .
          </p>
        </section>

        {/* While you're here — trending crafters in the city */}
        {trendingCrafters.length > 0 && city && (
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[3px] text-forest">
                  While you&apos;re here
                </p>
                <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                  Crafters making things in{" "}
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

  // ── Returning state ─────────────────────────────────────────────────
  // Saves on this user's listings in the last 7 days.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const ownedSelectors: Array<{
    entity_type: "CRAFTER" | "STORE" | "STUDIO" | "EVENT";
    entity_id: string;
  }> = [
    ...crafters.map((c) => ({ entity_type: "CRAFTER" as const, entity_id: c.id })),
    ...stores.map((s) => ({ entity_type: "STORE" as const, entity_id: s.id })),
    ...studios.map((s) => ({ entity_type: "STUDIO" as const, entity_id: s.id })),
    ...events.map((e) => ({ entity_type: "EVENT" as const, entity_id: e.id })),
  ];
  const savesThisWeek =
    ownedSelectors.length === 0
      ? 0
      : await prisma.save.count({
          where: {
            created_at: { gte: sevenDaysAgo },
            OR: ownedSelectors,
          },
        });

  // Unread-conversation count for the activity strip — same rule as the sidebar
  // badge and /dashboard/messages: unread when owner_last_read_at is null or
  // older than last_message_at.
  const ownerConvs = await prisma.conversation.findMany({
    where: { owner_user_id: user.id },
    select: { owner_last_read_at: true, last_message_at: true },
  });
  const unreadMessages = ownerConvs.filter(
    (c) => !c.owner_last_read_at || c.owner_last_read_at.getTime() < c.last_message_at.getTime(),
  ).length;

  // Build "latest listing" — most recently created across all owned entities.
  type LatestCandidate = {
    name: string;
    thumb: string | null;
    href: string;
    created_at: Date;
  };
  const latestCandidates: LatestCandidate[] = [
    ...crafters.map((c) => ({
      name: c.name,
      thumb: c.profile_photo,
      href: `/${c.city.slug}/crafters/${c.slug}`,
      created_at: c.created_at,
    })),
    ...stores.map((s) => ({
      name: s.name,
      thumb: s.logo_photo,
      href: `/${s.city.slug}/stores/${s.slug}`,
      created_at: s.created_at,
    })),
    ...studios.map((s) => ({
      name: s.name,
      thumb: s.logo_photo,
      href: `/${s.city.slug}/learn/${s.slug}`,
      created_at: s.created_at,
    })),
  ];
  latestCandidates.sort((a, b) => +b.created_at - +a.created_at);
  const latest = latestCandidates[0];
  const latestListing = latest
    ? { name: latest.name, thumb: latest.thumb ?? "", href: latest.href }
    : null;

  return (
    <div>
      <EventTracker
        name="signup_completed"
        props={{ role: user.role }}
        dedupKey={`signup_completed:${user.id}`}
        includeSignupSource
      />
      {/* Eyebrow + welcome */}
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-[3px] text-forest">
          Your dashboard
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Welcome back,{" "}
          <em className="font-semibold italic text-magenta">{firstName}</em>.
        </h1>
      </div>

      {/* Activity strip */}
      <div className="mt-5">
        <ActivityStrip
          savesThisWeek={savesThisWeek}
          unreadMessages={unreadMessages}
          latestListing={latestListing}
          cityName={crafters[0]?.city.display_name}
        />
      </div>

      {/* Your listings */}
      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[3px] text-forest">
              The shop
            </p>
            <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
              Your listings
            </h2>
          </div>
        </div>

        <ul className="mt-4 grid gap-3">
          {crafters.map((c) => (
            <ListingRow
              key={c.id}
              kind="Crafter"
              name={c.name}
              cityName={c.city.display_name}
              status={c.status}
              thumb={c.profile_photo}
              viewHref={`/${c.city.slug}/crafters/${c.slug}`}
              editHref={`/dashboard/crafter`}
            />
          ))}
          {stores.map((s) => (
            <ListingRow
              key={s.id}
              kind="Store"
              name={s.name}
              cityName={s.city.display_name}
              status={s.status}
              thumb={s.logo_photo}
              viewHref={`/${s.city.slug}/stores/${s.slug}`}
              editHref={`/dashboard/store`}
            />
          ))}
          {studios.map((s) => (
            <ListingRow
              key={s.id}
              kind="Studio"
              name={s.name}
              cityName={s.city.display_name}
              status={s.status}
              thumb={s.logo_photo}
              viewHref={`/${s.city.slug}/learn/${s.slug}`}
              editHref={`/dashboard/studio`}
            />
          ))}
          {events.map((e) => (
            <ListingRow
              key={e.id}
              kind="Event"
              name={e.name}
              cityName={null}
              status={e.status}
              thumb={e.cover_image}
              viewHref={`/dashboard/events`}
              editHref={`/dashboard/events`}
            />
          ))}
        </ul>

        {/* Per-type Add CTAs */}
        <div className="mt-6 flex flex-wrap gap-2">
          {crafters.length === 0 && (
            <Link
              href="/dashboard/crafter/new"
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} /> Add crafter profile
            </Link>
          )}
          <Link href="/dashboard/store/new" className="btn btn-ghost btn-sm">
            <Plus size={14} /> Add store
          </Link>
          <Link href="/dashboard/studio/new" className="btn btn-ghost btn-sm">
            <Plus size={14} /> Add studio
          </Link>
          <Link href="/dashboard/events/new" className="btn btn-ghost btn-sm">
            <Plus size={14} /> Host event
          </Link>
        </div>
      </section>

      <ForYouSection userId={user.id} />
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

function ListingRow({
  kind,
  name,
  cityName,
  status,
  thumb,
  viewHref,
  editHref,
}: {
  kind: string;
  name: string;
  cityName: string | null;
  status: string;
  thumb: string | null;
  viewHref: string;
  editHref: string;
}) {
  return (
    <li className="card flex items-center gap-4 p-3 sm:p-4">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-canvas-sunken">
        <SafeImage
          src={thumb}
          alt={name}
          fill
          sizes="56px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{name}</p>
        <p className="truncate text-xs text-ink-muted">
          {kind}
          {cityName ? ` · ${cityName}` : ""} · {status.toLowerCase()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link href={editHref} className="btn btn-ghost btn-sm" aria-label={`Edit ${name}`}>
          <Pencil size={12} /> Edit
        </Link>
        <Link href={viewHref} className="btn btn-sm" aria-label={`View ${name}`}>
          View
        </Link>
      </div>
    </li>
  );
}
