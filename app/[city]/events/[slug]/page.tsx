import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MapPin, Share2, Heart } from "lucide-react";
import { formatINR } from "@/lib/util";
import { EventCard } from "@/components/Cards";
import { HCard } from "@/components/HCard";
import { StickyCTA } from "@/components/StickyCTA";
import { BottomNav } from "@/components/BottomNav";
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

export default async function EventDetail({
  params,
}: {
  params: { city: string; slug: string };
}) {
  const city = await getCityBySlug(params.city);
  if (!city) notFound();

  const e = await prisma.event.findUnique({
    where: { slug: params.slug },
    include: {
      city: true,
      organizer_crafter: true,
      organizer_store: true,
      organizer_studio: true,
      craft_category: true,
    },
  });
  if (!e || e.status !== "PUBLISHED" || e.city_id !== city.id) {
    const r = await prisma.slugRedirect.findUnique({
      where: { entity_type_old_slug: { entity_type: "event", old_slug: params.slug } },
    }).catch(() => null);
    if (r) redirect(`/${params.city}/events/${r.new_slug}`);
    notFound();
  }

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

  const bringList = [
    "Yarn or your current project — any weight, leftover scraps welcome",
    "Tools relevant to the craft (hooks, needles, paint kit, etc.)",
    "A water bottle and something light to sit on",
    "An open mind and curiosity — beginners genuinely encouraged",
  ];

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
      <div
        className="cover-wrap bg-cream-2"
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          overflow: "hidden",
        }}
      >
        <Image
          src={e.cover_image}
          alt={`${e.name} event cover`}
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
        <div
          className="nav-photo md:hidden"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
            padding: "14px 16px",
            pointerEvents: "none",
          }}
        >
          <Link
            href={`/${city.slug}/events`}
            className="icon-btn back"
            aria-label="Back"
            style={{ pointerEvents: "auto" }}
          >
            <ArrowLeft size={18} />
          </Link>
          <ShareButton
            title={e.name}
            text={e.name}
            className="icon-btn right"
            style={{ pointerEvents: "auto" }}
          >
            <Share2 size={18} aria-hidden="true" />
          </ShareButton>
        </div>

        <div
          className="date-badge"
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            background: "rgb(var(--mustard))",
            color: "rgb(var(--ink))",
            padding: "9px 14px",
            borderRadius: "var(--r-pill)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.15,
            letterSpacing: "0.6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          }}
        >
          <span
            className="d"
            style={{
              fontSize: 20,
              fontWeight: 800,
              display: "block",
              lineHeight: 1,
              marginBottom: 2,
            }}
          >
            {dayNum}
          </span>
          {dayShort} {monthShort}
        </div>

        <span
          className={priceClass}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            padding: "7px 14px",
            fontSize: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          }}
        >
          {priceLabel}
        </span>
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
                <span className="tag magenta">20–30 makers expected</span>
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
                What to bring
              </h2>
              <div className="alert info" style={{ display: "block" }}>
                <ul
                  className="bring-list"
                  style={{ listStyle: "none", padding: 0, margin: 0 }}
                >
                  {bringList.map((item) => (
                    <li
                      key={item}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        padding: "6px 0",
                        fontSize: 13.5,
                        lineHeight: 1.5,
                        color: "rgb(var(--ink))",
                      }}
                    >
                      <span
                        style={{
                          color: "rgb(var(--mustard))",
                          fontSize: 14,
                          flexShrink: 0,
                          lineHeight: 1.4,
                        }}
                      >
                        ✿
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
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
                Getting there
              </h2>
              <p
                style={{
                  color: "rgb(var(--muted))",
                  lineHeight: 1.6,
                  fontSize: 15,
                }}
              >
                <strong className="text-forest">
                  {e.venue_name}
                </strong>
                {e.venue_address ? ` — ${e.venue_address}` : ""}
              </p>
              <div
                aria-label="Map embed coming soon"
                className="bg-cream-2 text-muted"
                style={{
                  marginTop: 12,
                  aspectRatio: "16 / 8",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg)",
                  display: "grid",
                  placeItems: "center",
                  padding: "16px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    textAlign: "center",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="bg-cream text-forest"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "1px solid var(--line)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <MapPin size={18} />
                  </span>
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: 13.5,
                      lineHeight: 1.45,
                      maxWidth: 320,
                      color: "rgb(var(--muted))",
                    }}
                  >
                    Map embed coming soon — see venue address above.
                  </p>
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
                    alignItems: "baseline",
                    gap: 12,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: 60,
                      lineHeight: 0.9,
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
                  <a
                    href={e.registration_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary w-full"
                    style={{ padding: 14 }}
                  >
                    I&apos;ll be there →
                  </a>
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

                <div
                  style={{
                    marginTop: 18,
                    padding: "12px 14px",
                    background: "var(--tint-mustard)",
                    borderRadius: "var(--r-md)",
                    border: "1px solid rgb(var(--mustard) / 0.3)",
                    fontSize: 12.5,
                    color: "rgb(var(--muted))",
                    lineHeight: 1.5,
                  }}
                >
                  <strong
                    style={{
                      color: "rgb(var(--ink))",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    Capacity
                  </strong>
                  <div style={{ marginTop: 2 }}>
                    20–30 makers typically attend. All welcome — beginners
                    genuinely encouraged.
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <StickyCTA
        primaryLabel="I'll be there →"
        primaryHref={e.registration_url}
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

      <CoSaveRecommendations entityType="EVENT" entityId={e.id} />

      <BottomNav city={city.slug} active="explore" />
    </article>
  );
}
