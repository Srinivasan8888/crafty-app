import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { notFound, redirect } from "next/navigation";
import { Phone, MessageCircle, Globe, MapPin, Mail, Flag, Heart, Share2, Sparkles, Clock } from "lucide-react";
import type { Metadata } from "next";
import { StickyCTA } from "@/components/StickyCTA";
import { HCard } from "@/components/HCard";
import { SaveButton } from "@/components/SaveButton";
import { ShareButton } from "@/components/ShareButton";
import { formatDateShort } from "@/lib/util";
import { MobileTabs } from "./_components/MobileTabs";
import { EventTracker } from "@/components/EventTracker";
import { buildStudioJsonLd, jsonLdSafe } from "@/lib/json-ld";
import { ReviewSection } from "@/components/ReviewSection";
import { CoSaveRecommendations } from "@/components/CoSaveRecommendations";
import { MessageButton } from "@/components/MessageButton";
import { ProductCard } from "@/components/ProductCard";
import { CrossLinkCard } from "@/components/CrossLinkCard";
import { getCurrentUser } from "@/lib/auth";
import { isPro } from "@/lib/subscription-gates";
import { ClaimRequestForm } from "@/components/ClaimRequestForm";

export const revalidate = 60;

const DAYS: Array<{ key: string; label: string }> = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

type Course = { name?: string; discipline?: string; schedule?: string; level?: string; price?: string };

const loadStudio = cache(async (citySlug: string, slug: string) => {
  const city = await getCityBySlug(citySlug);
  if (!city) return null;
  const studio = await prisma.studio.findUnique({
    where: { slug },
    include: {
      city: true,
      craft_disciplines: { include: { discipline: true } },
      // V3 — surface the owner's Pro tier for the badge.
      owner: { select: { subscription_tier: true, subscription_expires_at: true } },
    },
  });
  if (!studio || studio.status !== "PUBLISHED" || studio.city_id !== city.id) return null;
  return studio;
});

async function maybeRedirectByOldSlug(citySlug: string, slug: string): Promise<void> {
  const r = await prisma.slugRedirect
    .findUnique({ where: { entity_type_old_slug: { entity_type: "studio", old_slug: slug } } })
    .catch(() => null);
  if (r) redirect(`/${citySlug}/learn/${r.new_slug}`);
}

export async function generateMetadata({ params }: { params: { city: string; slug: string } }): Promise<Metadata> {
  const s = await loadStudio(params.city, params.slug);
  if (!s) {
    await maybeRedirectByOldSlug(params.city, params.slug);
    return {};
  }
  return {
    title: `${s.name} — Crafty`,
    description: `Learn at ${s.name} · ${s.is_online_only ? "Online studio" : `${s.address}, ${s.city.display_name}`}`,
    openGraph: { images: [s.logo_photo], title: s.name },
  };
}

function readHours(hours: unknown): Array<{ key: string; label: string; value: string }> {
  if (!hours || typeof hours !== "object") return [];
  const h = hours as Record<string, unknown>;
  return DAYS.map((d) => {
    const v = h[d.key] ?? h[d.label] ?? h[d.label.toLowerCase()];
    return { key: d.key, label: d.label, value: typeof v === "string" ? v : "Closed" };
  });
}

function readCourses(courses: unknown): Course[] {
  if (!courses) return [];
  if (Array.isArray(courses)) {
    return courses.filter((c): c is Course => typeof c === "object" && c !== null);
  }
  return [];
}

export default async function StudioDetail({ params }: { params: { city: string; slug: string } }) {
  const s = await loadStudio(params.city, params.slug);
  if (!s) {
    await maybeRedirectByOldSlug(params.city, params.slug);
    notFound();
  }

  const upcomingEvents = await prisma.event.findMany({
    where: { organizer_studio_id: s.id, status: "PUBLISHED", end_at: { gte: new Date() } },
    orderBy: { start_at: "asc" }, take: 6,
  });

  const [productsForSale, viewer] = await Promise.all([
    prisma.product.findMany({
      where: { studio_id: s.id, status: "PUBLISHED" },
      orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
      take: 12,
      select: {
        id: true, name: true, price_inr: true, photos: true,
        photo_blurhashes: true, inventory: true, owner_user_id: true,
      },
    }),
    getCurrentUser(),
  ]);

  const sampleCrafters = await prisma.crafter.findMany({
    where: { city_id: s.city_id, status: "PUBLISHED", offers_classes: true },
    orderBy: { is_featured: "desc" },
    take: 3,
    select: { id: true, slug: true, name: true, profile_photo: true, tagline: true },
  });

  // Cross-links: other listings the same owner runs (real pages only).
  const [ownerCrafter, ownerStore] = s.owner_user_id
    ? await Promise.all([
        prisma.crafter.findFirst({
          where: { owner_user_id: s.owner_user_id, status: "PUBLISHED" },
          select: { slug: true, name: true, profile_photo: true },
        }),
        prisma.store.findFirst({
          where: { owner_user_id: s.owner_user_id, status: "PUBLISHED" },
          select: { slug: true, name: true, logo_photo: true },
        }),
      ])
    : [null, null];
  const hasOwnerLinks = Boolean(ownerCrafter || ownerStore);

  const hours = readHours(s.operating_hours);
  const courses = readCourses(s.ongoing_courses);
  const disciplineNames = s.craft_disciplines.map((j) => j.discipline.display_name);

  const primaryHref = s.contact_whatsapp
    ? `https://wa.me/${s.contact_whatsapp.replace(/[^0-9]/g, "")}`
    : s.contact_phone
      ? `tel:${s.contact_phone}`
      : s.contact_website ?? undefined;
  const primaryLabel = s.contact_whatsapp
    ? `WhatsApp ${s.contact_whatsapp}`
    : s.contact_phone
      ? `Call studio`
      : "Visit studio";

  const mapQ = encodeURIComponent(`${s.name}, ${s.address}, ${s.city.display_name}`);

  const aboutPane = (
    <section className="seg-section about" style={{ padding: "14px 18px 18px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, marginBottom: 10 }}>
        About {s.name}
      </h2>
      <p className="text-muted" style={{ lineHeight: 1.65, fontSize: 14 }}>
        {s.is_online_only
          ? `${s.name} runs online classes — join from anywhere in India.`
          : `${s.name} is a craft studio in ${s.address}, ${s.city.display_name}.`}{" "}
        {s.age_group ? `Best suited for ${s.age_group.toLowerCase()}.` : "Open to all ages."}
      </p>
      {disciplineNames.length > 0 && (
        <p className="text-muted" style={{ lineHeight: 1.65, fontSize: 14, marginTop: 10 }}>
          Disciplines taught: {disciplineNames.join(", ")}.
        </p>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
        <span className="tag">Listed since {formatDateShort(s.created_at)}</span>
        {s.is_claimed ? <span className="tag mustard">Claimed</span> : <span className="tag magenta">Unclaimed</span>}
        {s.age_group && <span className="tag">Age: {s.age_group}</span>}
      </div>
    </section>
  );

  const disciplinesPane = (
    <section className="seg-section" style={{ padding: "14px 18px 18px" }}>
      <div className="sec-head" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>Disciplines</h2>
        <span className="text-muted" style={{ fontSize: 12 }}>{disciplineNames.length} taught</span>
      </div>
      {disciplineNames.length === 0 ? (
        <p className="text-muted" style={{ fontSize: 14 }}>No disciplines listed yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {disciplineNames.map((d) => (
            <div key={d} className="hcard" style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, borderRadius: "var(--r-lg)", border: "1px solid var(--line-strong)", background: "rgb(var(--cream))" }}>
              <div
                style={{
                  flex: "0 0 56px",
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--tint-mustard)",
                  border: "1px solid rgb(var(--mustard) / 0.5)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  color: "rgb(var(--magenta))",
                }}
              >
                ✻
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>{d}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>Group classes · drop-in welcome</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const schedulePane = (
    <section className="seg-section" style={{ padding: "14px 18px 18px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, marginBottom: 10 }}>
        Schedule &amp; courses
      </h2>
      {courses.length > 0 ? (
        <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {courses.map((c, i) => (
            <li
              key={i}
              style={{
                padding: 12,
                background: "rgb(var(--cream))",
                border: "1px solid var(--line-strong)",
                borderRadius: "var(--r-lg)",
              }}
            >
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>
                {c.name ?? c.discipline ?? "Ongoing course"}
              </div>
              {c.schedule && <div className="text-muted" style={{ fontSize: 12.5, marginTop: 3 }}>{c.schedule}</div>}
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {c.level && <span className="tag">{c.level}</span>}
                {c.price && <span className="price-pill">{c.price}</span>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted" style={{ fontSize: 14 }}>
          {hours.length > 0
            ? "Course details coming soon. See opening hours below."
            : "Schedule not listed yet — message the studio to confirm timings."}
        </p>
      )}
      {hours.length > 0 && (
        <ul style={{ display: "flex", flexDirection: "column", marginTop: 16 }}>
          {hours.map((d) => (
            <li
              key={d.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--line)",
                fontSize: 14,
              }}
            >
              <span style={{ fontWeight: 600 }}>{d.label}</span>
              <span className="text-muted">{d.value}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  // The real <ReviewSection> renders live at the bottom of the page (mobile +
  // desktop). The mobile tab just points to it instead of duplicating the
  // widget or showing a hardcoded "coming soon" placeholder.
  const reviewsPane = (
    <section className="seg-section" style={{ padding: "14px 18px 18px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, marginBottom: 10 }}>Reviews</h2>
      <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
        {s.owner_user_id
          ? "Read what makers say below, or leave your own."
          : "This studio hasn't been claimed yet, so reviews aren't open."}
      </p>
      {s.owner_user_id && (
        <a
          href="#reviews-heading"
          className="text-magenta"
          style={{ display: "inline-block", marginTop: 8, fontSize: 13.5, fontWeight: 600 }}
        >
          Jump to reviews →
        </a>
      )}
    </section>
  );

  return (
    <article style={{ paddingBottom: 120 }}>
      <EventTracker
        name="profile_view"
        props={{ entity_type: "STUDIO", entity_id: s.id, slug: s.slug, city: s.city.slug }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(buildStudioJsonLd(s)) }}
      />
      <div className="container">
        <nav className="breadcrumb">
          <Link href={`/${s.city.slug}`}>{s.city.display_name}</Link>
          <span className="sep">/</span>
          <Link href={`/${s.city.slug}/learn`}>Learn</Link>
          <span className="sep">/</span>
          <span className="ink">{s.name}</span>
        </nav>
      </div>

      <section className="profile-hero-v2">
        <div className="cover" style={{ aspectRatio: "16/9", position: "relative" }}>
          <Image src={s.logo_photo} alt={`${s.name} studio`} fill priority sizes="100vw" className="object-cover" />
        </div>
        <header className="nav-photo md:hidden">
          <Link href={`/${s.city.slug}/learn`} className="icon-btn dark" aria-label="Back">
            ←
          </Link>
          <div style={{ flex: 1 }} />
          <ShareButton
            title={s.name}
            text={s.name}
            className="icon-btn dark"
          >
            <Share2 size={16} aria-hidden="true" />
          </ShareButton>
          <SaveButton
            entityType="studio"
            entityId={s.id}
            variant="icon"
            className="icon-btn dark"
          />
        </header>

        <div className="name-block">
          <h1>{s.name}</h1>
          <div className="loc">
            <MapPin size={14} style={{ display: "inline-block", marginRight: 4, verticalAlign: "-2px" }} />
            {s.is_online_only ? "Online studio" : `${s.address.split(",")[0]}, ${s.city.display_name}`}
          </div>
        </div>

        <div className="badges-row">
          {s.is_featured && (
            <span className="badge feat">
              <Sparkles size={11} style={{ display: "inline-block", marginRight: 3, verticalAlign: "-1px" }} />
              Featured
            </span>
          )}
          {isPro(s.owner) && (
            <span className="badge" style={{ background: "var(--tint-mustard-mid, rgb(var(--cream-2)))", color: "rgb(var(--magenta))", border: "1px solid rgb(var(--magenta) / 0.3)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Sparkles size={10} aria-hidden="true" /> Pro
            </span>
          )}
          {!s.is_claimed && (
            <ClaimRequestForm
              entityType="STUDIO"
              entityId={s.id}
              entityName={s.name}
              triggerClassName="badge claim"
              triggerLabel="Claim this listing →"
            />
          )}
          {s.age_group && <span className="badge classes">{s.age_group}</span>}
          {s.is_online_only && <span className="badge online">Online</span>}
        </div>

        <div className="chips-row">
          {disciplineNames.slice(0, 6).map((d) => (
            <span key={d} className="chip">
              {d}
            </span>
          ))}
        </div>
      </section>

      <MobileTabs about={aboutPane} disciplines={disciplinesPane} schedule={schedulePane} reviews={reviewsPane} />

      <div
        className="hidden md:block"
        style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "32px var(--container-pad) 56px" }}
      >
        <div className="grid gap-14 lg:grid-cols-3" style={{ alignItems: "flex-start" }}>
          <div className="lg:col-span-2">
            <section className="detail-section">
              <h2 style={{ fontSize: 22, marginBottom: 14 }}>About {s.name}</h2>
              <div className="about" style={{ fontSize: 15.5, lineHeight: 1.7 }}>
                <p>
                  {s.is_online_only
                    ? `${s.name} is an online craft studio teaching makers across India.`
                    : `${s.name} runs out of ${s.address}, ${s.city.display_name}. Drop in for a class or a short workshop.`}
                </p>
                {disciplineNames.length > 0 && (
                  <p style={{ marginTop: 12 }}>
                    Disciplines taught: <strong>{disciplineNames.join(", ")}</strong>.
                  </p>
                )}
                <div className="about-meta" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
                  <span className="tag">Listed since {formatDateShort(s.created_at)}</span>
                  {s.is_claimed ? <span className="tag mustard">Claimed</span> : <span className="tag magenta">Unclaimed</span>}
                  {s.age_group && <span className="tag">Age: {s.age_group}</span>}
                </div>
              </div>
            </section>

            <section className="detail-section" style={{ borderTop: "1px solid var(--line)", paddingTop: 24, marginTop: 24 }}>
              <div className="sec-head" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ fontSize: 22 }}>Disciplines taught</h2>
                <span className="text-muted" style={{ fontSize: 13 }}>{disciplineNames.length} disciplines</span>
              </div>
              {disciplineNames.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 14 }}>No disciplines listed yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {disciplineNames.map((d) => (
                    <div
                      key={d}
                      style={{
                        padding: 14,
                        background: "rgb(var(--cream))",
                        border: "1px solid var(--line-strong)",
                        borderRadius: "var(--r-lg)",
                        boxShadow: "var(--soft-shadow)",
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          flex: "0 0 48px",
                          width: 48,
                          height: 48,
                          borderRadius: "var(--r-md)",
                          background: "var(--tint-mustard-mid)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 22,
                          color: "rgb(var(--magenta))",
                        }}
                      >
                        ✻
                      </div>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>{d}</div>
                        <div className="text-muted" style={{ fontSize: 12.5 }}>Group classes</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {courses.length > 0 && (
              <section className="detail-section" style={{ borderTop: "1px solid var(--line)", paddingTop: 24, marginTop: 24 }}>
                <h2 style={{ fontSize: 22, marginBottom: 14 }}>Ongoing courses</h2>
                <div className="grid grid-cols-2 gap-3">
                  {courses.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 14,
                        background: "rgb(var(--cream))",
                        border: "1px solid var(--line-strong)",
                        borderRadius: "var(--r-lg)",
                        boxShadow: "var(--soft-shadow)",
                      }}
                    >
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>
                        {c.name ?? c.discipline ?? "Course"}
                      </div>
                      {c.schedule && (
                        <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>{c.schedule}</div>
                      )}
                      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                        {c.level && <span className="tag">{c.level}</span>}
                        {c.price && <span className="price-pill">{c.price}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {upcomingEvents.length > 0 && (
              <section className="detail-section" style={{ borderTop: "1px solid var(--line)", paddingTop: 24, marginTop: 24 }}>
                <div className="sec-head" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
                  <h2 style={{ fontSize: 22 }}>Upcoming events here</h2>
                  <span className="text-muted" style={{ fontSize: 13 }}>{upcomingEvents.length} scheduled</span>
                </div>
                <ul style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {upcomingEvents.map((e) => (
                    <li key={e.id}>
                      <Link href={`/${s.city.slug}/events/${e.slug}`} className="related-event block">
                        <div className="date-pill">
                          <span>{new Date(e.start_at).toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase()}</span>
                          <span className="d">
                            {new Date(e.start_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }).toUpperCase()}
                          </span>
                        </div>
                        <div className="info">
                          <div className="ttl">{e.name}</div>
                          <div className="meta">
                            {new Date(e.start_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {e.venue_name}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="detail-section" style={{ borderTop: "1px solid var(--line)", paddingTop: 24, marginTop: 24 }}>
              <h2 style={{ fontSize: 22, marginBottom: 14 }}>Crafters in {s.city.display_name}</h2>
              {sampleCrafters.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 14 }}>No crafters listed in {s.city.display_name} yet.</p>
              ) : (
                <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {sampleCrafters.map((c) => (
                    <li key={c.id}>
                      <HCard
                        href={`/${s.city.slug}/crafters/${c.slug}`}
                        imageSrc={c.profile_photo}
                        title={c.name}
                        meta={c.tagline ?? "Local crafter"}
                      />
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-subtle" style={{ marginTop: 10, fontSize: 12, fontStyle: "italic" }}>
                Other crafters in {s.city.display_name} — studio tagging coming soon.
              </p>
            </section>

            <section
              className="detail-section text-subtle"
              style={{ borderTop: "1px solid var(--line)", paddingTop: 24, marginTop: 24, fontStyle: "italic", fontSize: 13 }}
            >
              <p>
                Something off about this listing?{" "}
                <Link
                  href={`/contact?ref=report&type=studio&slug=${s.slug}`}
                  style={{ borderBottom: "1px dotted currentColor" }}
                >
                  <Flag size={12} style={{ display: "inline-block", marginRight: 3, verticalAlign: "-1px" }} />
                  Report this profile
                </Link>{" "}
                — we read every report.
              </p>
            </section>
          </div>

          <aside className="space-y-4" style={{ position: "sticky", top: 88 }}>
            <div className="card p-5">
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
                Get in touch
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {s.contact_whatsapp && (
                  <a
                    href={`https://wa.me/${s.contact_whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener"
                    className="btn btn-forest btn-block"
                  >
                    <MessageCircle size={16} style={{ marginRight: 8 }} />
                    WhatsApp
                  </a>
                )}
                {s.contact_phone && (
                  <a href={`tel:${s.contact_phone}`} className="btn btn-primary btn-block">
                    <Phone size={16} style={{ marginRight: 8 }} />
                    Call studio
                  </a>
                )}
                {s.contact_website && (
                  <a href={s.contact_website} target="_blank" rel="noopener" className="btn btn-secondary btn-block">
                    <Globe size={16} style={{ marginRight: 8 }} />
                    Website
                  </a>
                )}
                {!s.contact_whatsapp && !s.contact_phone && !s.contact_website && (
                  <p className="text-muted" style={{ fontSize: 13 }}>No contact details listed yet.</p>
                )}
              </div>
            </div>

            {hasOwnerLinks && (
              <div className="card p-5">
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 10 }}>
                  Also runs
                </h2>
                <div className="flex flex-col gap-2">
                  {ownerCrafter && (
                    <CrossLinkCard
                      type="crafter"
                      name={ownerCrafter.name}
                      thumb={ownerCrafter.profile_photo}
                      href={`/${s.city.slug}/crafters/${ownerCrafter.slug}`}
                    />
                  )}
                  {ownerStore && (
                    <CrossLinkCard
                      type="store"
                      name={ownerStore.name}
                      thumb={ownerStore.logo_photo}
                      href={`/${s.city.slug}/stores/${ownerStore.slug}`}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="card p-5">
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Clock size={14} /> Studio hours
              </h2>
              {hours.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 13 }}>Hours not listed yet.</p>
              ) : (
                <ul style={{ display: "flex", flexDirection: "column" }}>
                  {hours.map((d) => (
                    <li
                      key={d.key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "6px 0",
                        borderBottom: "1px solid var(--line)",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{d.label}</span>
                      <span className="text-muted">{d.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!s.is_online_only && (
              <a
                href={`https://maps.google.com/?q=${mapQ}`}
                target="_blank"
                rel="noopener"
                className="card p-5 block"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Find us</h2>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{s.address}</p>
                <p className="text-muted" style={{ fontSize: 13 }}>{s.city.display_name}</p>
                <div
                  className="border border-forest/[0.22] text-forest"
                  style={{
                    marginTop: 12,
                    aspectRatio: "16/9",
                    background: "var(--tint-forest)",
                    borderRadius: "var(--r-md)",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={14} /> Open in Maps →
                  </span>
                </div>
              </a>
            )}

            {!s.is_claimed && (
              <div className="card p-5 border-magenta/[0.22]" style={{ background: "var(--tint-magenta)" }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Is this your studio?</h2>
                <p style={{ fontSize: 13, color: "rgb(var(--muted))", marginBottom: 10 }}>
                  Claim it to manage hours, courses, and respond to reviews.
                </p>
                <ClaimRequestForm
                  entityType="STUDIO"
                  entityId={s.id}
                  entityName={s.name}
                  triggerClassName="btn btn-primary btn-sm"
                  triggerLabel="Claim this listing →"
                />
              </div>
            )}
          </aside>
        </div>
      </div>

      {hasOwnerLinks && (
        <section className="md:hidden px-[18px] py-4">
          <h2 className="font-display" style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>
            Also runs
          </h2>
          <div className="flex flex-col gap-2">
            {ownerCrafter && (
              <CrossLinkCard
                type="crafter"
                name={ownerCrafter.name}
                thumb={ownerCrafter.profile_photo}
                href={`/${s.city.slug}/crafters/${ownerCrafter.slug}`}
              />
            )}
            {ownerStore && (
              <CrossLinkCard
                type="store"
                name={ownerStore.name}
                thumb={ownerStore.logo_photo}
                href={`/${s.city.slug}/stores/${ownerStore.slug}`}
              />
            )}
          </div>
        </section>
      )}

      <StickyCTA
        primaryLabel={primaryLabel}
        primaryHref={primaryHref}
        primaryVariant="forest"
        primaryIcon={s.contact_whatsapp ? <MessageCircle size={16} /> : <Phone size={16} />}
        iconActions={
          <>
            <SaveButton
              entityType="studio"
              entityId={s.id}
              variant="icon"
              className="icon-btn"
            />
            <ShareButton
              title={s.name}
              text={s.name}
              className="icon-btn"
            >
              <Share2 size={18} aria-hidden="true" />
            </ShareButton>
          </>
        }
      />
      {s.owner_user_id && (
        <div className="container mt-4 flex justify-center">
          <MessageButton entityType="STUDIO" entityId={s.id} ownerDisplayName={s.name} />
        </div>
      )}
      {productsForSale.length > 0 && (
        <section className="container mt-10">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            Shop <em className="font-semibold italic text-magenta">{s.name}</em>
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {productsForSale.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                price_inr={p.price_inr}
                photo={p.photos[0] ?? null}
                photo_blurhash={p.photo_blurhashes[0] ?? null}
                inventory={p.inventory}
                ownerIsViewer={viewer?.id === p.owner_user_id}
              />
            ))}
          </div>
        </section>
      )}
      {s.owner_user_id && (
        <ReviewSection entityType="STUDIO" entityId={s.id} ownerUserId={s.owner_user_id} />
      )}
      <CoSaveRecommendations entityType="STUDIO" entityId={s.id} />
    </article>
  );
}
