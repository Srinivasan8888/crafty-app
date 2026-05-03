import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { EventCard } from "@/components/Cards";
import { FeaturedCard } from "@/components/FeaturedCard";
import { EmptyState } from "@/components/EmptyState";
import { BottomNav } from "@/components/BottomNav";
import { EventsDateFilter } from "./_components/EventsDateFilter";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDateShort, formatINR } from "@/lib/util";

export const revalidate = 60;

const TYPES = ["WORKSHOP", "FAIR", "EXHIBITION", "CLASS", "POPUP", "OTHER"] as const;

const TYPE_PILLS: Array<{ id: string; label: string }> = [
  { id: "WORKSHOP", label: "Workshops" },
  { id: "OTHER", label: "Meetups" },
  { id: "FAIR", label: "Fairs" },
  { id: "POPUP", label: "Pop-ups" },
  { id: "EXHIBITION", label: "Online" },
];

export default async function EventsListing({
  params,
  searchParams,
}: {
  params: { city: string };
  searchParams: { type?: string; when?: string };
}) {
  const city = await getCityBySlug(params.city);
  if (!city) notFound();

  const active = searchParams.type;
  const when = searchParams.when ?? "all";
  const where = {
    city_id: city.id,
    status: "PUBLISHED" as const,
    end_at: { gte: new Date() },
    ...(active ? { event_type: active as (typeof TYPES)[number] } : {}),
  };
  const events = await prisma.event.findMany({
    where,
    take: 24,
    orderBy: { start_at: "asc" },
  });

  const featured =
    events.find((e) => e.is_featured) ??
    events.find((e) => e.is_free) ??
    events[0] ??
    null;
  const rest = featured ? events.filter((e) => e.id !== featured.id) : events;

  const featurePrice = featured
    ? featured.is_free
      ? "Free entry"
      : featured.price_amount
        ? formatINR(Number(featured.price_amount))
        : "Paid"
    : "";

  return (
    <>
      <div className="container py-6 md:py-8">
        <nav className="breadcrumb mb-4">
          <Link href={`/${city.slug}`}>{city.display_name}</Link>
          <span className="sep">›</span>
          <span className="muted">Events</span>
        </nav>

        <header className="listing-head">
          <div
            className="label-mustard"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "2.2px",
              color: "rgb(var(--forest))",
              marginBottom: 6,
            }}
          >
            {city.display_name.toUpperCase()} · UPCOMING
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
            Events in <em style={{ color: "rgb(var(--magenta))", fontStyle: "italic", fontWeight: 600 }}>{city.display_name}</em>
          </h1>
          <p
            className="sub"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              color: "rgb(var(--muted))",
              marginTop: 6,
              fontSize: 13,
            }}
          >
            {events.length} upcoming events. Free to attend most, easy to find.
          </p>
        </header>

        <section className="pill-strip" style={{ padding: "12px 0" }}>
          <EventsDateFilter active={when} />
        </section>

        <section className="pill-strip" style={{ padding: "0 0 12px" }}>
          <div className="pillrow no-scrollbar">
            <Link
              href={`/${city.slug}/events${when !== "all" ? `?when=${when}` : ""}`}
              className={`pill${!active ? " active" : ""}`}
            >
              All
            </Link>
            {TYPE_PILLS.map((t) => {
              const sp = new URLSearchParams();
              sp.set("type", t.id);
              if (when !== "all") sp.set("when", when);
              return (
                <Link
                  key={t.id}
                  href={`/${city.slug}/events?${sp.toString()}`}
                  className={`pill${active === t.id ? " active" : ""}`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </section>

        {(active || when !== "all") && (
          <div className="applied-filters">
            <span className="label">Filters</span>
            {active && (
              <Link
                href={`/${city.slug}/events${when !== "all" ? `?when=${when}` : ""}`}
                className="filter-chip"
              >
                {TYPE_PILLS.find((t) => t.id === active)?.label ?? active}
                <span className="x">×</span>
              </Link>
            )}
            {when !== "all" && (
              <Link
                href={`/${city.slug}/events${active ? `?type=${active}` : ""}`}
                className="filter-chip"
              >
                {when === "today"
                  ? "Today"
                  : when === "weekend"
                    ? "This weekend"
                    : when === "next7"
                      ? "Next 7 days"
                      : "This month"}
                <span className="x">×</span>
              </Link>
            )}
            <Link href={`/${city.slug}/events`} className="clear">
              Clear all
            </Link>
          </div>
        )}

        {events.length === 0 ? (
          <EmptyState
            title={`No upcoming events in ${city.display_name}`}
            body="Check back soon — new gatherings, workshops and pop-ups are added every week."
            ctaLabel="Host an event"
            ctaHref="/list-your-profile"
            variant="mustard"
          />
        ) : (
          <>
            {featured && (
              <div className="featured-wrap" style={{ padding: "12px 0 18px" }}>
                <FeaturedCard
                  href={`/${city.slug}/events/${featured.slug}`}
                  imageSrc={featured.cover_image}
                  eyebrow={`${formatDateShort(new Date(featured.start_at)).toUpperCase()} · ${featured.venue_name.toUpperCase()}`}
                  title={featured.name}
                  meta={featured.description.slice(0, 140) + (featured.description.length > 140 ? "…" : "")}
                  primaryAction={{
                    label: "I'll be there",
                    href: `/${city.slug}/events/${featured.slug}`,
                  }}
                  secondaryAction={{
                    label: featurePrice,
                    href: `/${city.slug}/events/${featured.slug}`,
                  }}
                  badges={[
                    {
                      label: featured.is_featured ? "Featured event" : "Coming up next",
                      variant: "feat",
                    },
                    ...(featured.is_free
                      ? ([{ label: "Free entry", variant: "classes" }] as const)
                      : []),
                  ]}
                  saveTarget={{ entityType: "event", entityId: featured.id }}
                />
              </div>
            )}

            <div className="listing-grid" style={{ padding: "12px 0 24px" }}>
              {rest.map((e) => (
                <EventCard
                  key={e.id}
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
              ))}
            </div>

            <div
              className="pagination-wrap"
              style={{ padding: "6px 0 22px", textAlign: "center" }}
            >
              <div
                className="info"
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  color: "rgb(var(--muted))",
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                Showing {events.length} of {events.length} events
              </div>
              <Link
                href={`/${city.slug}/events`}
                className="btn btn-secondary btn-block"
              >
                Load more events
              </Link>
            </div>
          </>
        )}
      </div>

      <BottomNav city={city.slug} active="explore" />
    </>
  );
}
