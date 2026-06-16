// V3 — Community page.
//
// Public route. Three sections:
//   1. Vertical timeline of per-city CommunityMoment JSON, ordered by
//      city.display_order DESC (the moment itself has no timestamp).
//   2. "This week in {City}" — an editorial spotlight on one crafter in the
//      city. Selection is NOT a popularity ranking: an admin pin
//      (crafter.is_featured) wins first; otherwise a deterministic rotation
//      across published crafters that is stable within an ISO week and shifts
//      week to week. No save/popularity count is ever rendered here.
//   3. Ambient signal feed — last-24h aggregates, no PII.
//
// Schema is locked. Comments tease V3.1 as italic footer note.

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { CommunityMoment } from "@/components/CommunityMoment";
import { SafeImage } from "@/components/SafeImage";
import { buildAmbient } from "./_ambient";

export const revalidate = 300; // editorial, not real-time

type Moment = { photoUrl?: string; caption?: string } | null;

// ISO-8601 week number for a given date (weeks start Monday; week 1 contains
// the first Thursday of the year). Stable within a week, varies across weeks —
// used to rotate the weekly spotlight deterministically.
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Thursday of the current ISO week (day 0 = Sunday → treat as 7).
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export const metadata = {
  title: "Community — Crafty",
  description: "Moments from across India's craft community — by city.",
};

export default async function CommunityPage() {
  const t = await getTranslations("community");

  const cities = await prisma.city.findMany({
    where: { is_active: true },
    orderBy: { display_order: "desc" },
    select: { id: true, slug: true, display_name: true, community_moment: true },
  });

  // Weekly spotlight — city-scoped, NOT a popularity ranking.
  // 1) Admin pin: an is_featured crafter in the city wins (most recent first).
  // 2) Otherwise rotate deterministically across published crafters in the
  //    city — stable within an ISO week, shifting week to week.
  const defaultCity = process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru";
  const crafterSelect = {
    id: true,
    slug: true,
    name: true,
    tagline: true,
    profile_photo: true,
    city: { select: { slug: true, display_name: true } },
  } as const;

  let featured = await prisma.crafter.findFirst({
    where: { status: "PUBLISHED", is_featured: true, city: { slug: defaultCity } },
    orderBy: { updated_at: "desc" },
    select: crafterSelect,
  });

  if (!featured) {
    // Stable, lightweight rotation pool: published crafters in the city,
    // ordered deterministically so the index is reproducible across requests.
    const pool = await prisma.crafter.findMany({
      where: { status: "PUBLISHED", city: { slug: defaultCity } },
      orderBy: { created_at: "asc" },
      select: crafterSelect,
    });
    if (pool.length > 0) {
      const week = isoWeekNumber(new Date());
      featured = pool[week % pool.length];
    }
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentSaves = await prisma.save.findMany({
    where: { created_at: { gte: oneDayAgo } },
    select: { entity_type: true, entity_id: true },
    take: 500,
  });
  const ambient = await buildAmbient(recentSaves);

  const moments = cities
    .map((c) => ({ city: c, moment: (c.community_moment as Moment) ?? null }))
    .filter((row) => row.moment?.photoUrl && row.moment?.caption);

  return (
    <>
      <AppHeader city={process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru"} />
      <main id="main" className="min-h-screen pb-20 md:pb-0">
        <section className="py-10 md:py-14" style={{ background: "rgb(var(--cream))" }}>
          <div className="mx-auto px-[var(--container-pad)] text-center" style={{ maxWidth: 760 }}>
            <span className="inline-block font-display text-xs font-bold uppercase tracking-[3px] text-forest border-b border-mustard pb-1.5">
              {t("eyebrow")}
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 text-base text-ink-muted md:text-lg">{t("subtitle")}</p>
          </div>
        </section>

        {featured ? (
          <section className="container py-8 md:py-12">
            <div className="sec-title-bar" style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 22 }}>{t("thisWeekInCity", { city: featured.city.display_name })}</h2>
            </div>
            <Link
              href={`/${featured.city.slug}/crafters/${featured.slug}`}
              className="group block overflow-hidden rounded-xl border border-line-strong bg-cream-2 shadow-soft transition-shadow hover:shadow-soft-lg"
            >
              <div className="grid md:grid-cols-[1.1fr_1fr]">
                <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[320px]">
                  <SafeImage src={featured.profile_photo} alt={featured.name} fill priority sizes="(min-width:768px) 55vw, 100vw" className="object-cover" />
                </div>
                <div className="p-7 md:p-10">
                  <p className="font-display text-xs font-bold uppercase tracking-[3px] text-forest">
                    {featured.city.display_name}
                  </p>
                  <h3 className="mt-3 font-display text-3xl font-extrabold leading-[1.05] tracking-tight md:text-4xl">
                    {featured.name}
                  </h3>
                  {featured.tagline && (
                    <p className="mt-4 font-display text-base italic text-muted md:text-lg">{featured.tagline}</p>
                  )}
                  <p className="mt-6 text-sm text-ink-subtle">
                    {t("thisWeekBlurb", { city: featured.city.display_name })}
                  </p>
                </div>
              </div>
            </Link>
          </section>
        ) : (
          <section className="container py-6 md:py-8">
            <p className="font-display italic text-sm text-muted">{t("noFeatureYet")}</p>
          </section>
        )}

        <section className="container py-8 md:py-12">
          <div className="sec-title-bar" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 22 }}>{t("moments")}</h2>
          </div>
          {moments.length === 0 ? (
            <p className="font-display italic text-sm text-muted">{t("noActivity")}</p>
          ) : (
            <div className="flex flex-col gap-8 md:gap-12">
              {moments.map(({ city, moment }) => (
                <article key={city.id}>
                  <div className="mb-3 flex items-baseline gap-2">
                    <Link href={`/${city.slug}`} className="font-display text-lg font-bold tracking-tight text-ink hover:underline">
                      {city.display_name}
                    </Link>
                  </div>
                  <CommunityMoment photoUrl={moment!.photoUrl!} caption={moment!.caption!} />
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="container py-8 md:py-12">
          <div className="sec-title-bar" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 22 }}>{t("ambient")}</h2>
          </div>
          <p className="mb-4 text-sm text-ink-muted">{t("ambientSubtitle")}</p>
          {ambient.length === 0 ? (
            <p className="font-display italic text-sm text-muted">{t("noActivity")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ambient.map((row, i) => (
                <li key={i} className="rounded-md border border-line bg-cream-2 px-4 py-3 text-sm">
                  <span className="font-display font-semibold text-magenta">{row.count}</span>{" "}
                  <span className="text-ink-muted">{row.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="container pb-12">
          <p className="font-display italic text-sm text-muted text-center">{t("commentsTeaser")}</p>
        </section>
      </main>
      <AppFooter />
    </>
  );
}
