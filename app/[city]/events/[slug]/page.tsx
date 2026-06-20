import { cache } from "react";
import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowLeft, MapPin, Share2 } from "lucide-react";
import { formatINR } from "@/lib/util";
import { EventCard } from "@/components/Cards";
import { HCard } from "@/components/HCard";
import { StickyCTA } from "@/components/StickyCTA";
import { SaveButton } from "@/components/SaveButton";
import { ShareButton } from "@/components/ShareButton";
import { EventTracker } from "@/components/EventTracker";
import { buildEventJsonLd, jsonLdSafe } from "@/lib/json-ld";
import { CoSaveRecommendations } from "@/components/CoSaveRecommendations";

export const revalidate = 60;

const EVENT_TYPE_LABEL: Record<string, string> = {
  WORKSHOP: "Workshop",
  FAIR: "Fair",
  EXHIBITION: "Exhibition",
  CLASS: "Class",
  POPUP: "Pop-up",
  OTHER: "Community Meetup",
};

const loadEvent = cache(async (citySlug: string, slug: string) => {
  const city = await getCityBySlug(citySlug);
  if (!city) return null;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      city: true,
      organizer_crafter: true,
      organizer_store: true,
      organizer_studio: true,
      craft_category: true,
    },
  });
  if (!event || event.status !== "PUBLISHED" || event.city_id !== city.id) return null;
  return { city, event };
});

// registration_url is optional in practice: seeded/empty events carry a
// placeholder like https://example.com/... which is a dead outbound link.
// Treat empty, hash-only, and placeholder-host values as "no registration".
function liveRegistrationUrl(url: string | null | undefined): string | undefined {
  if (!url || url === "#") return undefined;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "example.com" || host === "example.org") return undefined;
  } catch {
    return undefined;
  }
  return url;
}

// Build an external Google Maps search link from whatever venue info we have.
// This is a normal outbound anchor, not an <iframe>: the page CSP only allows
// framing 'self' and Descope, so a Maps embed renders as a dead grey box, and a
// heavy map iframe is the wrong cost on the slow 4G our buyers are on. The
// keyless `api=1` search form is the official, always-stable link and resolves
// from a venue name alone, so seed events with no street address still map.
function mapsSearchHref(venueName: string, venueAddress: string | null | undefined) {
  const query = [venueName, venueAddress]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export async function generateMetadata({
  params,
}: {
  params: { city: string; slug: string };
}): Promise<Metadata> {
  const loaded = await loadEvent(params.city, params.slug);
  if (!loaded) return {};
  const { event: e } = loaded;
  const description = e.description?.slice(0, 160);
  return {
    title: `${e.name} · Crafty`,
    description,
    openGraph: { images: [e.cover_image], title: e.name, description },
  };
}

export default async function EventDetail({
  params,
}: {
  params: { city: string; slug: string };
}) {
  const loaded = await loadEvent(params.city, params.slug);
  if (!loaded) {
    const r = await prisma.slugRedirect.findUnique({
      where: { entity_type_old_slug: { entity_type: "event", old_slug: params.slug } },
    }).catch(() => null);
    if (r) redirect(`/${params.city}/events/${r.new_slug}`);
    notFound();
  }
  const { city, event: e } = loaded;
  const registrationUrl = liveRegistrationUrl(e.registration_url);
  const mapsHref = mapsSearchHref(e.venue_name, e.venue_address);

  const moreEvents = await prisma.event.findMany({
    where: {
      city_id: city.id,
      status: "PUBLISHED",
      end_at: { gte: new Date() },
      id: { not: e.id },
    },
    orderBy: { start_at: "asc" },
    take: 4,
  });

  const organizerName =
    e.organizer_crafter?.name ??
    e.organizer_store?.name ??
    e.organizer_studio?.name ??
    "Crafty community";
  const organizerHref = e.organizer_crafter
    ? `/${city.slug}/crafters/${e.organizer_crafter.slug}`
    : e.organizer_store
      ? `/${city.slug}/stores/${e.organizer_store.slug}`
      : e.organizer_studio
        ? `/${city.slug}/learn/${e.organizer_studio.slug}`
        : null;
  const organizerPhoto =
    (e.organizer_crafter && "profile_photo" in e.organizer_crafter
      ? (e.organizer_crafter as { profile_photo?: string }).profile_photo
      : undefined) ??
    (e.organizer_store && "logo_photo" in e.organizer_store
      ? (e.organizer_store as { logo_photo?: string }).logo_photo
      : undefined) ??
    (e.organizer_studio && "logo_photo" in e.organizer_studio
      ? (e.organizer_studio as { logo_photo?: string }).logo_photo
      : undefined) ??
    e.cover_image;
  const organizerRole = e.organizer_crafter
    ? `Crafter · ${city.display_name}`
    : e.organizer_store
      ? `Store · ${city.display_name}`
      : e.organizer_studio
        ? `Studio · ${city.display_name}`
        : `${city.display_name} community`;

  const start = new Date(e.start_at);
  const end = new Date(e.end_at);
  const dayNum = start.toLocaleDateString("en-IN", { day: "2-digit" });
  const dayName = start
    .toLocaleDateString("en-IN", { weekday: "long" });
  const dayShort = start
    .toLocaleDateString("en-IN", { weekday: "short" })
    .toUpperCase();
  const monthShort = start
    .toLocaleDateString("en-IN", { month: "short" })
    .toUpperCase();
  const monthYear = start.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
  const longDate = start.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeRange = `${start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;

  const priceLabel = e.is_free
    ? "Free entry"
    : e.price_amount
      ? formatINR(Number(e.price_amount))
      : "Paid";
  const priceClass = e.is_free ? "price-pill free" : "price-pill";

  const typeLabel =
    EVENT_TYPE_LABEL[e.event_type] ?? e.event_type.toLowerCase();

  // Dedupe city out of venue strings — seed venues like
  // "Cubbon Park, Bengaluru" already include the city, so naively
  // appending city would render "Cubbon Park, Bengaluru, Bengaluru".
  const cityName = e.city.display_name;
  const venueAlreadyHasCity = (s: string) =>
    s.toLowerCase().includes(cityName.toLowerCase());
  const venueWithCity = venueAlreadyHasCity(e.venue_name)
    ? e.venue_name
    : `${e.venue_name}, ${cityName}`;

  const paragraphs = e.description.split(/\n{2,}/).filter(Boolean);

  return (
    <article>
      <EventTracker
        name="profile_view"
        props={{ entity_type: "EVENT", entity_id: e.id, slug: e.slug, city: city.slug }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(buildEventJsonLd({ ...e, city })) }}
      />
      <div className="container" style={{ paddingTop: 18 }}>
        <div
          className="cover-wrap bg-cream-2 aspect-[16/9] md:aspect-auto md:h-[400px]"
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "var(--r-xl)",
            border: "1px solid var(--line-strong)",
            boxShadow: "var(--soft-shadow)",
          }}
        >
          <Image
            src={e.cover_image}
            alt={`${e.name} event cover`}
            fill
            sizes="(min-width: 1200px) 1152px, 100vw"
            priority
            className="object-cover"
          />

          {/* Controls split across the hero: navigation on the top row, event
              metadata on the bottom row. One chip per corner means nothing can
              overlap at any width (the old layout stacked the back button on top
              of the date badge). Opaque cream buttons read crisply over any
              cover photo and stay inside the warm theme. */}
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              right: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <Link
              href={`/${city.slug}/events`}
              className="icon-btn"
              aria-label="Back to events"
              style={{ pointerEvents: "auto", boxShadow: "var(--soft-shadow)" }}
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
            <ShareButton
              title={e.name}
              text={e.name}
              className="icon-btn"
              style={{ pointerEvents: "auto", boxShadow: "var(--soft-shadow)" }}
            >
              <Share2 size={18} aria-hidden="true" />
            </ShareButton>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 14,
              left: 14,
              right: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 10,
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <div
              style={{
                background: "rgb(var(--mustard))",
                color: "rgb(var(--ink))",
                padding: "8px 15px",
                borderRadius: "var(--r-pill)",
                fontFamily: "var(--font-display)",
                fontSize: 11,
                fontWeight: 700,
                textAlign: "center",
                lineHeight: 1.1,
                letterSpacing: "0.6px",
                boxShadow: "var(--soft-shadow)",
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  display: "block",
                  lineHeight: 1,
                  marginBottom: 1,
                }}
              >
                {dayNum}
              </span>
              {dayShort} {monthShort}
            </div>
            <span
              className={priceClass}
              style={{
                background: "rgb(var(--cream))",
                padding: "7px 14px",
                fontSize: 12,
                boxShadow: "var(--soft-shadow)",
              }}
            >
              {priceLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <nav className="breadcrumb mb-4">
          <Link href={`/${city.slug}`}>{city.display_name}</Link>
          <span className="sep">›</span>
          <Link href={`/${city.slug}/events`}>Events</Link>
          <span className="sep">›</span>
          <span className="muted">{e.name}</span>
        </nav>

        <div className="split-2 grid gap-10 md:grid-cols-[2fr_1fr]">
          <div className="left-col">
            <header
              style={{
                paddingBottom: 22,
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div
                className="label-mustard"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "2.2px",
                  color: "rgb(var(--mustard-dark))",
                }}
              >
                {typeLabel}
              </div>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 30,
                  letterSpacing: "-1px",
                  lineHeight: 1.05,
                  color: "rgb(var(--ink))",
                  marginTop: 8,
                }}
                className="md:!text-5xl md:tracking-[-1.5px]"
              >
                {e.name}
              </h1>
              <div
                className="loc"
                style={{
                  color: "rgb(var(--forest))",
                  fontSize: 13.5,
                  fontWeight: 600,
                  marginTop: 8,
                  fontFamily: "var(--font-display)",
                }}
              >
                {venueWithCity}
              </div>
              <div
                className="tag-row"
                style={{
                  marginTop: 14,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <span className="tag">
                  {longDate} · {start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className={e.is_free ? "tag mustard" : "tag"}>
                  {priceLabel}
                </span>
              </div>
            </header>

            <section
              className="detail-section"
              style={{
                paddingTop: 22,
                paddingBottom: 22,
                borderBottom: "1px solid var(--line)",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 12,
                  letterSpacing: "-0.4px",
                }}
              >
                About this event
              </h2>
              {paragraphs.length === 0 ? (
                <p
                  style={{
                    color: "rgb(var(--muted))",
                    lineHeight: 1.65,
                    fontSize: 15,
                  }}
                >
                  {e.description}
                </p>
              ) : (
                paragraphs.map((p, i) => (
                  <p
                    key={i}
                    style={{
                      color: "rgb(var(--muted))",
                      lineHeight: 1.65,
                      fontSize: 15,
                      marginTop: i === 0 ? 0 : 12,
                    }}
                  >
                    {p}
                  </p>
                ))
              )}
            </section>

            <section
              id="getting-there"
              className="detail-section"
              style={{
                paddingTop: 22,
                paddingBottom: 22,
                borderBottom: "1px solid var(--line)",
                scrollMarginTop: 80,
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 12,
                  letterSpacing: "-0.4px",
                }}
              >
                Getting there
              </h2>

              <div
                style={{
                  border: "1px solid var(--line-strong)",
                  borderRadius: "var(--r-lg)",
                  overflow: "hidden",
                  background: "rgb(var(--cream))",
                  boxShadow: "0 4px 12px rgba(180,80,40,0.08)",
                }}
              >
                {/* Stylised map field: a faint banana-leaf street grid with two
                    crossing roads and a marigold pin. Purely ornamental (we hold
                    no coordinates), so it signals "a place" without faking a
                    location, stays inside our frame-src CSP, and weighs nothing
                    on 4G. The real map is one tap away below. */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "relative",
                    height: 128,
                    display: "grid",
                    placeItems: "center",
                    background:
                      "linear-gradient(116deg, transparent 45.6%, rgba(230,168,23,0.20) 46%, rgba(230,168,23,0.20) 48.4%, transparent 48.8%)," +
                      "linear-gradient(22deg, transparent 61.5%, rgba(31,95,60,0.13) 61.9%, rgba(31,95,60,0.13) 63.2%, transparent 63.6%)," +
                      "repeating-linear-gradient(0deg, transparent 0 24px, rgba(31,95,60,0.05) 24px 25px)," +
                      "repeating-linear-gradient(90deg, transparent 0 24px, rgba(31,95,60,0.05) 24px 25px)," +
                      "rgb(var(--cream-2))",
                  }}
                >
                  <span
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: "var(--r-pill)",
                      background: "rgb(var(--mustard))",
                      color: "rgb(var(--ink))",
                      display: "grid",
                      placeItems: "center",
                      border: "2px solid rgb(var(--cream))",
                      boxShadow: "0 4px 12px rgba(180,80,40,0.20)",
                    }}
                  >
                    <MapPin size={26} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                </div>

                <div style={{ padding: "16px 18px 18px" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "rgb(var(--forest))",
                      lineHeight: 1.25,
                    }}
                  >
                    {e.venue_name}
                  </div>
                  {e.venue_address ? (
                    <p
                      style={{
                        color: "rgb(var(--muted))",
                        fontSize: 14,
                        lineHeight: 1.55,
                        marginTop: 4,
                      }}
                    >
                      {e.venue_address}
                    </p>
                  ) : (
                    <p
                      style={{
                        color: "rgb(var(--subtle))",
                        fontSize: 13.5,
                        lineHeight: 1.55,
                        marginTop: 4,
                      }}
                    >
                      The organiser shares the exact spot when you register, somewhere in {e.city.display_name}.
                    </p>
                  )}
                  {mapsHref && (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{
                        marginTop: 14,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <MapPin size={15} aria-hidden="true" />
                      Open in Google Maps
                    </a>
                  )}
                </div>
              </div>
            </section>

            <section
              className="detail-section"
              style={{
                paddingTop: 22,
                paddingBottom: 22,
                borderBottom: "1px solid var(--line)",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 12,
                  letterSpacing: "-0.4px",
                }}
              >
                Organized by
              </h2>
              {organizerHref ? (
                <HCard
                  href={organizerHref}
                  imageSrc={organizerPhoto}
                  title={organizerName}
                  meta={organizerRole}
                  rightSlot={
                    <span
                      className="tag mustard"
                      style={{ fontSize: 11 }}
                    >
                      View profile →
                    </span>
                  }
                />
              ) : (
                <div className="hcard">
                  <div className="img relative shrink-0 overflow-hidden">
                    <Image
                      src={organizerPhoto}
                      alt={organizerName}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div className="info">
                    <div className="ttl">{organizerName}</div>
                    <div className="meta">{organizerRole}</div>
                  </div>
                </div>
              )}
            </section>

            {moreEvents.length > 0 && (
              <section
                className="detail-section"
                style={{ paddingTop: 22, paddingBottom: 22 }}
              >
                <div
                  className="sec-title-bar"
                  style={{ marginBottom: 12 }}
                >
                  <h2 style={{ fontSize: 22 }}>
                    More events in{" "}
                    <em>{e.city.display_name}</em>
                  </h2>
                  <Link
                    href={`/${city.slug}/events`}
                    className="see-all"
                  >
                    See all →
                  </Link>
                </div>
                <div
                  className="snap-rail no-scrollbar"
                  style={{
                    display: "flex",
                    gap: 14,
                    overflowX: "auto",
                    paddingBottom: 6,
                  }}
                >
                  {moreEvents.map((m) => (
                    <div
                      key={m.id}
                      style={{ flex: "0 0 280px", maxWidth: 320 }}
                    >
                      <EventCard
                        id={m.id}
                        city={city.slug}
                        slug={m.slug}
                        name={m.name}
                        cover_image={m.cover_image}
                        start_at={m.start_at}
                        venue_name={m.venue_name}
                        is_free={m.is_free}
                        price_amount={m.price_amount?.toString()}
                        event_type={m.event_type}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="hidden md:block">
            <div
              className="sticky-card-wrap"
              style={{ position: "sticky", top: 100 }}
            >
              <div
                className="sticky-card bg-cream"
                style={{
                  border: "1px solid var(--line-strong)",
                  borderRadius: "var(--r-lg)",
                  padding: 26,
                  boxShadow: "0 12px 30px rgba(180,80,40,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: 60,
                      lineHeight: 1,
                      color: "rgb(var(--ink))",
                      letterSpacing: "-2.5px",
                    }}
                  >
                    {dayNum}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 16,
                      color: "rgb(var(--magenta))",
                      lineHeight: 1.1,
                    }}
                  >
                    {dayName}
                    <em
                      style={{
                        fontStyle: "normal",
                        display: "block",
                        color: "rgb(var(--muted))",
                        fontSize: 12.5,
                        fontWeight: 500,
                        marginTop: 4,
                        letterSpacing: "1.4px",
                        textTransform: "uppercase",
                      }}
                    >
                      {monthYear.toUpperCase()}
                    </em>
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "rgb(var(--forest))",
                    marginTop: 10,
                  }}
                >
                  {timeRange}
                </div>

                <div style={{ marginTop: 14 }}>
                  <span className={priceClass}>{priceLabel}</span>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    fontSize: 13,
                    color: "rgb(var(--muted))",
                    paddingBottom: 4,
                  }}
                >
                  <strong
                    style={{
                      color: "rgb(var(--forest))",
                      display: "block",
                      fontFamily: "var(--font-display)",
                      fontSize: 14,
                      marginBottom: 2,
                    }}
                  >
                    {e.venue_name}
                  </strong>
                  {e.venue_address ?? `${e.city.display_name} · venue details on registration`}
                  <Link
                    href="#getting-there"
                    style={{
                      display: "inline-block",
                      marginTop: 6,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "rgb(var(--magenta))",
                    }}
                  >
                    View on map →
                  </Link>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    marginTop: 22,
                  }}
                >
                  {registrationUrl ? (
                    <a
                      href={registrationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary w-full"
                      style={{ padding: 14 }}
                    >
                      I&apos;ll be there →
                    </a>
                  ) : organizerHref ? (
                    <Link
                      href={organizerHref}
                      className="btn btn-primary w-full"
                      style={{ padding: 14 }}
                    >
                      Ask {organizerName} →
                    </Link>
                  ) : null}
                  <SaveButton
                    entityType="event"
                    entityId={e.id}
                    variant="button"
                    className="btn btn-secondary w-full"
                    style={{ padding: 14 }}
                  />
                  <a
                    href={`/${city.slug}/events/${e.slug}/ics`}
                    className="btn btn-ghost w-full"
                    style={{ padding: 12 }}
                    aria-label="Download .ics file to add this event to your calendar"
                  >
                    Add to calendar
                  </a>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 18,
                    paddingTop: 18,
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${e.name} — ${city.display_name} on Crafty`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn bg-cream text-forest"
                    style={{
                      flex: 1,
                      padding: "9px 8px",
                      borderRadius: "var(--r-pill)",
                      border: "1px solid var(--line-strong)",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "var(--font-display)",
                      textAlign: "center",
                    }}
                  >
                    WhatsApp
                  </a>
                  <a
                    href="https://instagram.com/crafty.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn bg-cream text-forest"
                    style={{
                      flex: 1,
                      padding: "9px 8px",
                      borderRadius: "var(--r-pill)",
                      border: "1px solid var(--line-strong)",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "var(--font-display)",
                      textAlign: "center",
                    }}
                  >
                    Instagram
                  </a>
                  <ShareButton
                    title={e.name}
                    text={e.name}
                    className="share-btn bg-cream text-forest"
                    style={{
                      flex: 1,
                      padding: "9px 8px",
                      borderRadius: "var(--r-pill)",
                      border: "1px solid var(--line-strong)",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    Copy link
                  </ShareButton>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <StickyCTA
        primaryLabel={registrationUrl ? "I'll be there →" : organizerHref ? `Ask ${organizerName} →` : "Add to calendar"}
        primaryHref={registrationUrl ?? organizerHref ?? `/${city.slug}/events/${e.slug}/ics`}
        primaryVariant="magenta"
        iconActions={
          <>
            <SaveButton
              entityType="event"
              entityId={e.id}
              variant="icon"
              className="icon-btn"
            />
            <ShareButton
              title={e.name}
              text={e.name}
              className="icon-btn"
            >
              <Share2 size={18} aria-hidden="true" />
            </ShareButton>
          </>
        }
      />

      <section className="px-[18px] py-3 italic text-subtle" style={{ fontSize: 12.5 }}>
        <p>
          Something off about this event?{" "}
          <Link
            href={`/contact?ref=report&type=event&slug=${e.slug}`}
            style={{ borderBottom: "1px dotted rgb(var(--subtle))" }}
          >
            Report this listing
          </Link>{" "}
          — we read every report.
        </p>
      </section>

      <CoSaveRecommendations entityType="EVENT" entityId={e.id} />
    </article>
  );
}
