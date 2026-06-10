import { cache } from "react";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { notFound, redirect } from "next/navigation";
import { EventTracker } from "@/components/EventTracker";
import { buildCrafterJsonLd, jsonLdSafe } from "@/lib/json-ld";
import { ReviewSection } from "@/components/ReviewSection";
import { CoSaveRecommendations } from "@/components/CoSaveRecommendations";
import { MessageButton } from "@/components/MessageButton";
import { ProductCard } from "@/components/ProductCard";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Heart,
  Instagram,
  MessageCircle,
  Share2,
} from "lucide-react";
import type { Metadata } from "next";
import { GalleryStrip } from "@/components/GalleryStrip";
import { HCard } from "@/components/HCard";
import { StickyCTA } from "@/components/StickyCTA";
import { SaveButton } from "@/components/SaveButton";
import { ShareButton } from "@/components/ShareButton";
import { MobileTabs } from "./_components/MobileTabs";
import { formatINR } from "@/lib/util";
import { isPro } from "@/lib/subscription-gates";
import { Sparkles } from "lucide-react";
import { ClaimRequestForm } from "@/components/ClaimRequestForm";

export const revalidate = 60;

const loadCrafter = cache(async (citySlug: string, slug: string) => {
  const city = await getCityBySlug(citySlug);
  if (!city) return null;
  const crafter = await prisma.crafter.findUnique({
    where: { slug },
    include: {
      city: true,
      craft_categories: { include: { category: true } },
      owner: true,
    },
  });
  if (!crafter || crafter.status !== "PUBLISHED" || crafter.city_id !== city.id) return null;
  return crafter;
});

// Slug-redirect lookup must happen OUTSIDE cache() and BEFORE layout streams,
// otherwise Next.js degrades the redirect() throw into a client-side meta-refresh.
// We call it from generateMetadata (runs before HTML render) and from the page
// (covers the metadata-skipped path too).
async function maybeRedirectByOldSlug(citySlug: string, slug: string): Promise<void> {
  const r = await prisma.slugRedirect
    .findUnique({ where: { entity_type_old_slug: { entity_type: "crafter", old_slug: slug } } })
    .catch(() => null);
  if (r) redirect(`/${citySlug}/crafters/${r.new_slug}`);
}

export async function generateMetadata({
  params,
}: {
  params: { city: string; slug: string };
}): Promise<Metadata> {
  const c = await loadCrafter(params.city, params.slug);
  if (!c) {
    await maybeRedirectByOldSlug(params.city, params.slug);
    return {};
  }
  return {
    title: `${c.name} — Crafty`,
    description: c.tagline ?? c.bio ?? `${c.name} on Crafty`,
    openGraph: { images: [c.profile_photo], title: c.name, description: c.tagline ?? "" },
  };
}

type ClassEntry = {
  name?: string;
  format?: string;
  price?: string | number;
  description?: string;
};

type ProductEntry = {
  name?: string;
  meta?: string;
  price?: string | number;
  image?: string;
};

function parseClasses(json: unknown): ClassEntry[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((entry): ClassEntry | null => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      return {
        name: typeof e.name === "string" ? e.name : undefined,
        format: typeof e.format === "string" ? e.format : undefined,
        price:
          typeof e.price === "string" || typeof e.price === "number" ? e.price : undefined,
        description: typeof e.description === "string" ? e.description : undefined,
      };
    })
    .filter((x): x is ClassEntry => x !== null);
}

function priceLabel(p: string | number | undefined): string | null {
  if (p === undefined || p === null || p === "") return null;
  const num = typeof p === "number" ? p : Number(p);
  if (!Number.isFinite(num)) return typeof p === "string" ? p : null;
  return formatINR(num);
}

export default async function CrafterDetail({
  params,
}: {
  params: { city: string; slug: string };
}) {
  const c = await loadCrafter(params.city, params.slug);
  if (!c) {
    await maybeRedirectByOldSlug(params.city, params.slug);
    notFound();
  }

  const [otherStore, otherStudio, upcomingEvents, productsForSale, viewer] = await Promise.all([
    prisma.store.findFirst({
      where: { owner_user_id: c.owner_user_id, status: "PUBLISHED" },
    }),
    prisma.studio.findFirst({
      where: { owner_user_id: c.owner_user_id, status: "PUBLISHED" },
    }),
    prisma.event.findMany({
      where: {
        organizer_crafter_id: c.id,
        status: "PUBLISHED",
        end_at: { gte: new Date() },
      },
      orderBy: { start_at: "asc" },
      take: 6,
    }),
    prisma.product.findMany({
      where: { crafter_id: c.id, status: "PUBLISHED" },
      orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
      take: 12,
      select: {
        id: true, name: true, price_inr: true, photos: true,
        photo_blurhashes: true, inventory: true, owner_user_id: true,
      },
    }),
    getCurrentUser(),
  ]);

  const classes = parseClasses(c.classes_json);
  const products: ProductEntry[] = [];

  const categoryNames = c.craft_categories.map((j) => j.category.display_name);
  const neighborhood = categoryNames[0] ?? c.city.display_name;
  const locText = `${neighborhood}, ${c.city.display_name}`;

  const whatsappHref = c.contact_whatsapp
    ? `https://wa.me/${c.contact_whatsapp.replace(/[^0-9]/g, "")}`
    : null;
  const instagramHref = c.contact_instagram
    ? `https://instagram.com/${c.contact_instagram.replace(/^@/, "")}`
    : null;
  const websiteHref = c.contact_website ?? null;

  const listedSince = c.created_at.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });

  const savesPlaceholder = 142;
  const responsePlaceholder = "< 2h";

  const aboutBlock = (
    <section className="seg-section about">
      <h2 className="font-display text-lg font-bold" style={{ marginBottom: 10 }}>
        About {c.name.split(" ")[0]}
      </h2>
      {c.bio ? (
        c.bio.split("\n\n").map((p, i) => (
          <p key={i} className={`text-muted ${i > 0 ? "mt-2.5" : ""}`.trim()} style={{ lineHeight: 1.65, fontSize: 14 }}>
            {p}
          </p>
        ))
      ) : (
        <p className="text-muted" style={{ lineHeight: 1.65, fontSize: 14 }}>
          {c.tagline ?? `${c.name} hasn't added a bio yet.`}
        </p>
      )}
      <div className="about-meta mt-4 flex flex-wrap gap-1.5">
        <span className="tag">{savesPlaceholder} saves</span>
        <span className="tag mustard">Listed since {listedSince}</span>
        {neighborhood && <span className="tag magenta">{neighborhood}</span>}
      </div>
    </section>
  );

  const portfolioBlock =
    c.portfolio_photos.length > 0 ? (
      <section className="seg-section">
        <div className="sec-head flex items-baseline justify-between mb-2.5">
          <h2 className="font-display text-lg font-bold">Portfolio</h2>
          <span className="text-xs text-muted">
            {c.portfolio_photos.length} photos
          </span>
        </div>
        <GalleryStrip images={c.portfolio_photos} alt={`${c.name} portfolio`} aspectRatio="1" />
      </section>
    ) : (
      <section className="seg-section">
        <p className="text-muted" style={{ fontSize: 14 }}>No portfolio photos yet.</p>
      </section>
    );

  const productsBlock =
    products.length > 0 ? (
      <section className="seg-section">
        <div className="sec-head flex items-baseline justify-between mb-2.5">
          <h2 className="font-display text-lg font-bold">Products on order</h2>
          <span className="text-xs text-muted">
            {products.length} items
          </span>
        </div>
        <div className="hcard-list flex flex-col gap-2.5">
          {products.map((p, i) => (
            <HCard
              key={i}
              href="#"
              imageSrc={p.image ?? c.profile_photo}
              title={p.name ?? "Product"}
              meta={p.meta ?? ""}
              rightSlot={
                priceLabel(p.price) ? <span className="price-pill">{priceLabel(p.price)}</span> : null
              }
            />
          ))}
        </div>
      </section>
    ) : (
      <section className="seg-section">
        <p className="text-muted" style={{ fontSize: 14 }}>
          {c.name.split(" ")[0]} doesn&rsquo;t list ready products yet — DM on WhatsApp for custom orders.
        </p>
      </section>
    );

  const classesBlock =
    classes.length > 0 || upcomingEvents.length > 0 ? (
      <section className="seg-section">
        <div className="sec-head flex items-baseline justify-between mb-2.5">
          <h2 className="font-display text-lg font-bold">Classes &amp; workshops</h2>
          {c.offers_classes && <span className="badge classes">Teaches</span>}
        </div>

        <div className="hcard-list flex flex-col gap-2.5">
          {classes.map((cls, i) => (
            <div key={i} className="hcard">
              <div
                aria-hidden="true"
                style={{
                  flex: "0 0 56px",
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--tint-mustard-mid)",
                  border: "1px solid rgb(var(--mustard) / 0.5)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  color: "rgb(var(--magenta))",
                  lineHeight: 1,
                }}
              >
                ✻
              </div>
              <div className="info">
                <div className="ttl">{cls.name ?? "Workshop"}</div>
                <div className="meta">{cls.format ?? cls.description ?? ""}</div>
                {priceLabel(cls.price) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="price-pill">{priceLabel(cls.price)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {upcomingEvents.map((e) => {
            const date = new Date(e.start_at);
            const dow = date.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase();
            const day = `${date.getDate()} ${date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}`;
            return (
              <Link
                key={e.id}
                href={`/${c.city.slug}/events/${e.slug}`}
                className="related-event"
              >
                <div className="date-pill">
                  {dow}
                  <span className="d">{day}</span>
                </div>
                <div className="img relative overflow-hidden">
                  <Image
                    src={e.cover_image}
                    alt={e.name}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <div className="info">
                  <div className="ttl">{e.name}</div>
                  <div className="meta">
                    {e.venue_name} · {c.name.split(" ")[0]} will be there
                  </div>
                  <div className="mt-1.5">
                    {e.is_free ? (
                      <span className="price-pill free">FREE</span>
                    ) : (
                      <span className="price-pill">
                        {e.price_amount ? formatINR(Number(e.price_amount)) : "Paid"}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    ) : (
      <section className="seg-section">
        <p className="text-muted" style={{ fontSize: 14 }}>No classes or workshops listed.</p>
      </section>
    );

  return (
    <article>
      <EventTracker
        name="profile_view"
        props={{ entity_type: "CRAFTER", entity_id: c.id, slug: c.slug, city: c.city.slug }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(buildCrafterJsonLd(c)) }}
      />
      <div className="container hidden md:block">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href={`/${c.city.slug}`}>{c.city.display_name}</Link>
          <span className="sep">/</span>
          <Link href={`/${c.city.slug}/crafters`}>Crafters</Link>
          <span className="sep">/</span>
          <span className="ink">{c.name}</span>
        </nav>
      </div>

      <section className="profile-hero-v2 md:hidden">
        <div className="cover relative" style={{ aspectRatio: "16/10" }}>
          <Image
            src={c.profile_photo}
            alt={c.name}
            fill
            sizes="100vw"
            priority
            fetchPriority="high"
            className="object-cover"
          />
        </div>
        <header className="nav-photo">
          <Link href={`/${c.city.slug}/crafters`} className="icon-btn dark" aria-label="Back">
            <ArrowLeft size={16} />
          </Link>
          <div className="spacer flex-1" />
          <ShareButton
            title={c.name}
            text={c.tagline ?? c.bio ?? c.name}
            className="icon-btn dark"
          >
            <Share2 size={16} aria-hidden="true" />
          </ShareButton>
          <SaveButton
            entityType="crafter"
            entityId={c.id}
            variant="icon"
            className="icon-btn dark"
          />
          {/* trailing-anchor for layout parity */}
        </header>

        <div className="name-block">
          <h1>{c.name}</h1>
          <div className="loc">{locText}</div>
        </div>

        <div className="badges-row">
          {c.is_featured && <span className="badge feat">Featured</span>}
          {isPro(c.owner) && (
            <span className="badge" style={{ background: "var(--tint-mustard-mid, rgb(var(--cream-2)))", color: "rgb(var(--magenta))", border: "1px solid rgb(var(--magenta) / 0.3)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Sparkles size={10} aria-hidden="true" /> Pro
            </span>
          )}
          {c.offers_classes && <span className="badge classes">Teaches classes</span>}
          {!c.is_claimed && (
            <ClaimRequestForm
              entityType="CRAFTER"
              entityId={c.id}
              entityName={c.name}
              triggerClassName="badge claim"
              triggerLabel="Claim this listing →"
            />
          )}
        </div>

        {categoryNames.length > 0 && (
          <div className="chips-row">
            {categoryNames.slice(0, 4).map((n) => (
              <span key={n} className="chip">
                {n}
              </span>
            ))}
          </div>
        )}

        {c.tagline && <p className="tagline">&ldquo;{c.tagline}&rdquo;</p>}
      </section>

      <div className="md:hidden">
        {(() => {
          // Hide tiles with no data so the strip doesn't render bare em-dashes
          // ("— SALES", "— CONTACTS"). Grid collapses to populated cells only.
          const tiles = [
            { lbl: "Saves", num: String(savesPlaceholder) },
            { lbl: "Response", num: responsePlaceholder },
            { lbl: "Listed", num: listedSince },
          ].filter((t) => t.num && t.num !== "—");
          if (tiles.length === 0) return null;
          return (
            <div className="stat-row mt-4">
              {tiles.map((t) => (
                <div className="stat" key={t.lbl}>
                  <span className="num">{t.num}</span>
                  <span className="lbl">{t.lbl}</span>
                </div>
              ))}
            </div>
          );
        })()}

        <MobileTabs
          aboutContent={aboutBlock}
          portfolioContent={portfolioBlock}
          productsContent={productsBlock}
          classesContent={classesBlock}
        />

        {(otherStore || otherStudio) && (
          <section className="px-[18px] py-4">
            <h2 className="font-display text-lg font-bold mb-2.5">Also runs</h2>
            <div className="flex flex-col gap-2">
              {otherStore && (
                <Link
                  href={`/${c.city.slug}/stores/${otherStore.slug}`}
                  className="hcard"
                >
                  <div className="img relative shrink-0 overflow-hidden">
                    <Image
                      src={otherStore.logo_photo}
                      alt={otherStore.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div className="info">
                    <div className="ttl">{otherStore.name}</div>
                    <div className="meta">Store · {c.city.display_name}</div>
                  </div>
                </Link>
              )}
              {otherStudio && (
                <Link
                  href={`/${c.city.slug}/learn/${otherStudio.slug}`}
                  className="hcard"
                >
                  <div className="img relative shrink-0 overflow-hidden">
                    <Image
                      src={otherStudio.logo_photo}
                      alt={otherStudio.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div className="info">
                    <div className="ttl">{otherStudio.name}</div>
                    <div className="meta">Studio · {c.city.display_name}</div>
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}

        <section className="px-[18px] py-3 italic text-subtle" style={{ fontSize: 12.5 }}>
          <p>
            Something off about this profile?{" "}
            <Link
              href={`/contact?ref=report&type=crafter&slug=${c.slug}`}
              style={{ borderBottom: "1px dotted rgb(var(--subtle))" }}
            >
              Report this listing
            </Link>{" "}
            — we read every report.
          </p>
        </section>
      </div>

      <div className="hidden md:block">
        <section
          className="profile-hero"
          style={{ position: "relative" }}
        >
          <div className="cover relative" style={{ aspectRatio: "16/7" }}>
            <Image
              src={c.profile_photo}
              alt={c.name}
              fill
              sizes="100vw"
              priority
              fetchPriority="high"
              className="object-cover"
            />
          </div>
        </section>

        <div className="container">
          <div className="grid gap-10 pt-8 pb-14 lg:grid-cols-[1.5fr_1fr]">
            <div className="flex flex-col gap-10">
              <header>
                <div
                  role="heading"
                  aria-level={1}
                  className="font-display"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 42,
                    fontWeight: 800,
                    letterSpacing: "-1px",
                    lineHeight: 1.05,
                  }}
                >
                  {c.name}
                </div>
                <div className="loc mt-1.5 text-sm font-semibold text-forest">
                  {locText}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.is_featured && <span className="badge feat">Featured</span>}
                  {isPro(c.owner) && (
                    <span className="badge" style={{ background: "var(--tint-mustard-mid, rgb(var(--cream-2)))", color: "rgb(var(--magenta))", border: "1px solid rgb(var(--magenta) / 0.3)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Sparkles size={10} aria-hidden="true" /> Pro
                    </span>
                  )}
                  {c.offers_classes && <span className="badge classes">Teaches classes</span>}
                  <span className="tag">{savesPlaceholder} saves</span>
                  <span className="tag mustard">Listed since {listedSince}</span>
                </div>
                {categoryNames.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {categoryNames.map((n) => (
                      <span key={n} className="chip">
                        {n}
                      </span>
                    ))}
                  </div>
                )}
                {c.tagline && (
                  <p
                    className="mt-4 max-w-[640px] italic text-muted"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      lineHeight: 1.55,
                    }}
                  >
                    &ldquo;{c.tagline}&rdquo;
                  </p>
                )}
              </header>

              <section className="about">
                <h2
                  className="font-display"
                  style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}
                >
                  About {c.name.split(" ")[0]}
                </h2>
                {c.bio ? (
                  c.bio.split("\n\n").map((p, i) => (
                    <p
                      key={i}
                      className={i > 0 ? "mt-3" : undefined}
                      style={{ fontSize: 15.5, lineHeight: 1.7 }}
                    >
                      {p}
                    </p>
                  ))
                ) : (
                  <p className="text-muted" style={{ fontSize: 15.5, lineHeight: 1.7 }}>
                    {c.tagline ?? `${c.name} hasn't added a bio yet.`}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="tag">{savesPlaceholder} saves</span>
                  <span className="tag mustard">Listed since {listedSince}</span>
                  {neighborhood && <span className="tag magenta">{neighborhood} local</span>}
                </div>
              </section>

              {c.portfolio_photos.length > 0 && (
                <section>
                  <div className="sec-head flex items-baseline justify-between mb-3.5">
                    <h2
                      className="font-display"
                      style={{ fontSize: 22, fontWeight: 700 }}
                    >
                      Portfolio
                    </h2>
                    <span className="text-sm text-muted">
                      {c.portfolio_photos.length} photos
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {c.portfolio_photos.map((url, i) => (
                      <div
                        key={i}
                        className="relative overflow-hidden rounded-lg"
                        style={{ aspectRatio: "1", background: "rgb(var(--cream-2))" }}
                      >
                        <Image
                          src={url}
                          alt={`${c.name} portfolio ${i + 1}`}
                          fill
                          sizes="(max-width:1024px) 33vw, 320px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {classes.length > 0 && (
                <section>
                  <div className="sec-head flex items-baseline justify-between mb-3.5">
                    <h2
                      className="font-display"
                      style={{ fontSize: 22, fontWeight: 700 }}
                    >
                      Classes &amp; workshops
                    </h2>
                    {c.offers_classes && <span className="badge classes">Teaches</span>}
                  </div>
                  <div className="flex flex-col gap-3.5">
                    {classes.map((cls, i) => (
                      <div
                        key={i}
                        className="flex gap-3.5 p-4"
                        style={{
                          background: "rgb(var(--cream))",
                          border: "1px solid var(--line-strong)",
                          borderRadius: "var(--r-lg)",
                          boxShadow: "var(--soft-shadow)",
                        }}
                      >
                        <div
                          aria-hidden="true"
                          style={{
                            flex: "0 0 64px",
                            width: 64,
                            height: 64,
                            borderRadius: "var(--r-md)",
                            background: "var(--tint-mustard-mid)",
                            border: "1px solid rgb(var(--mustard) / 0.5)",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 28,
                          }}
                        >
                          ✻
                        </div>
                        <div className="info">
                          <div
                            className="ttl"
                            style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, lineHeight: 1.25 }}
                          >
                            {cls.name ?? "Workshop"}
                          </div>
                          <div
                            className="meta mt-1.5 text-muted"
                            style={{ fontSize: 13 }}
                          >
                            {cls.format ?? cls.description ?? ""}
                          </div>
                          {priceLabel(cls.price) && (
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              <span className="price-pill">{priceLabel(cls.price)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {upcomingEvents.length > 0 && (
                <section>
                  <h2
                    className="font-display mb-3.5"
                    style={{ fontSize: 22, fontWeight: 700 }}
                  >
                    Upcoming events
                  </h2>
                  <div className="flex flex-col gap-3">
                    {upcomingEvents.map((e) => {
                      const date = new Date(e.start_at);
                      const dow = date.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase();
                      const day = `${date.getDate()} ${date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}`;
                      return (
                        <Link
                          key={e.id}
                          href={`/${c.city.slug}/events/${e.slug}`}
                          className="related-event"
                        >
                          <div className="date-pill">
                            {dow}
                            <span className="d">{day}</span>
                          </div>
                          <div className="img relative overflow-hidden">
                            <Image
                              src={e.cover_image}
                              alt={e.name}
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          </div>
                          <div className="info">
                            <div className="ttl">{e.name}</div>
                            <div className="meta">{e.venue_name}</div>
                            <div className="mt-1.5">
                              {e.is_free ? (
                                <span className="price-pill free">FREE</span>
                              ) : (
                                <span className="price-pill">
                                  {e.price_amount ? formatINR(Number(e.price_amount)) : "Paid"}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            <aside>
              <div
                className="flex flex-col gap-4"
                style={{ position: "sticky", top: 88 }}
              >
                <div
                  style={{
                    background: "rgb(var(--cream))",
                    border: "1px solid var(--line-strong)",
                    borderRadius: "var(--r-lg)",
                    boxShadow: "var(--soft-shadow)",
                    padding: 20,
                  }}
                >
                  <div
                    className="font-display"
                    style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}
                  >
                    Get in touch
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {whatsappHref && (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-forest btn-block flex items-center gap-2"
                      >
                        <MessageCircle size={16} />
                        <span className="font-bold">WhatsApp</span>
                        {c.contact_whatsapp && (
                          <span className="ml-auto text-xs opacity-90">{c.contact_whatsapp}</span>
                        )}
                      </a>
                    )}
                    {instagramHref && (
                      <a
                        href={instagramHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-block flex items-center gap-2"
                      >
                        <Instagram size={16} />
                        <span className="font-bold">Instagram</span>
                        {c.contact_instagram && (
                          <span className="ml-auto text-xs opacity-90">@{c.contact_instagram.replace(/^@/, "")}</span>
                        )}
                      </a>
                    )}
                    {websiteHref && (
                      <a
                        href={websiteHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-block flex items-center gap-2"
                      >
                        <Globe size={16} />
                        <span className="font-bold">Website</span>
                      </a>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    background: "rgb(var(--cream))",
                    border: "1px solid var(--line-strong)",
                    borderRadius: "var(--r-lg)",
                    boxShadow: "var(--soft-shadow)",
                    padding: 20,
                  }}
                >
                  <StatRow label="Saved by community" value={`${savesPlaceholder} saves`} highlight />
                  <StatRow label="Listed since" value={listedSince} />
                  <StatRow label="Response time" value={responsePlaceholder} />
                </div>

                {(otherStore || otherStudio) && (
                  <div
                    className="border border-forest/[0.22]"
                    style={{
                      background: "var(--tint-forest)",
                      borderRadius: "var(--r-lg)",
                      padding: 20,
                    }}
                  >
                    <div
                      className="font-display text-forest"
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "1.4px",
                        fontWeight: 600,
                      }}
                    >
                      Also runs →
                    </div>
                    {otherStore && (
                      <Link
                        href={`/${c.city.slug}/stores/${otherStore.slug}`}
                        className="block mt-2 text-ink"
                      >
                        <div
                          className="font-display"
                          style={{ fontWeight: 700, fontSize: 18 }}
                        >
                          {otherStore.name}
                        </div>
                        <div className="text-sm text-muted">
                          Store · {c.city.display_name}
                        </div>
                        <span
                          className="inline-block mt-3 text-sm font-semibold text-forest"
                          style={{
                            borderBottom: "1px solid rgb(var(--mustard))",
                            paddingBottom: 1,
                          }}
                        >
                          View store →
                        </span>
                      </Link>
                    )}
                    {otherStudio && (
                      <Link
                        href={`/${c.city.slug}/learn/${otherStudio.slug}`}
                        className="block mt-3 text-ink"
                      >
                        <div
                          className="font-display"
                          style={{ fontWeight: 700, fontSize: 18 }}
                        >
                          {otherStudio.name}
                        </div>
                        <div className="text-sm text-muted">
                          Studio · {c.city.display_name}
                        </div>
                        <span
                          className="inline-block mt-3 text-sm font-semibold text-forest"
                          style={{
                            borderBottom: "1px solid rgb(var(--mustard))",
                            paddingBottom: 1,
                          }}
                        >
                          View studio →
                        </span>
                      </Link>
                    )}
                  </div>
                )}

                <div
                  className="px-1 italic text-sm text-subtle"
                  style={{ lineHeight: 1.5 }}
                >
                  Something off about this profile?{" "}
                  <Link
                    href={`/contact?ref=report&type=crafter&slug=${c.slug}`}
                    style={{ borderBottom: "1px dotted rgb(var(--subtle))" }}
                  >
                    Report this listing
                  </Link>{" "}
                  — we read every report.
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {whatsappHref && (
        <StickyCTA
          primaryLabel={`WhatsApp ${c.contact_whatsapp ?? ""}`.trim()}
          primaryHref={whatsappHref}
          primaryVariant="forest"
          primaryIcon={<MessageCircle size={16} />}
          iconActions={
            <>
              <SaveButton
                entityType="crafter"
                entityId={c.id}
                variant="icon"
                className="icon-btn"
              />
              <ShareButton
                title={c.name}
                text={c.tagline ?? c.bio ?? c.name}
                className="icon-btn"
              >
                <Share2 size={16} aria-hidden="true" />
              </ShareButton>
            </>
          }
        />
      )}
      <div className="container mt-4 flex justify-center">
        <MessageButton entityType="CRAFTER" entityId={c.id} ownerDisplayName={c.name} />
      </div>
      {productsForSale.length > 0 && (
        <section className="container mt-10">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            Shop {c.name.split(" ")[0]}&rsquo;s <em className="font-semibold italic text-magenta">products</em>
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
      <ReviewSection entityType="CRAFTER" entityId={c.id} ownerUserId={c.owner_user_id} />
      <CoSaveRecommendations entityType="CRAFTER" entityId={c.id} />
    </article>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between py-3.5 first:pt-0 first:border-t-0"
      style={{ borderTop: "1px solid var(--line)" }}
    >
      <span className="text-sm text-muted">
        {label}
      </span>
      <span
        className="font-display text-ink"
        style={{ fontWeight: 700, fontSize: 16 }}
      >
        {highlight ? (
          <em
            className="italic text-magenta"
            style={{ fontWeight: 600 }}
          >
            {value}
          </em>
        ) : (
          value
        )}
      </span>
    </div>
  );
}
