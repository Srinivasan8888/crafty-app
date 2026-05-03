import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { StudioCard } from "@/components/Cards";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { StudioFilters, type AppliedFilter } from "./_components/Filters";

export const revalidate = 60;

const PAGE_SIZE = 24;

export default async function LearnListing({
  params, searchParams,
}: { params: { city: string }; searchParams: { discipline?: string } }) {
  const city = await getCityBySlug(params.city);
  if (!city) notFound();

  const disciplines = await prisma.discipline.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } });
  const active = searchParams.discipline;
  const where = {
    city_id: city.id,
    status: "PUBLISHED" as const,
    ...(active ? { craft_disciplines: { some: { discipline: { slug: active } } } } : {}),
  };
  const studios = await prisma.studio.findMany({
    where, take: PAGE_SIZE,
    orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
    include: { craft_disciplines: { include: { discipline: true } } },
  });

  const totalCount = await prisma.studio.count({ where });

  const activeLabel = active ? disciplines.find((d) => d.slug === active)?.display_name : undefined;
  const appliedFilters: AppliedFilter[] = activeLabel
    ? [{ key: `discipline:${active}`, label: activeLabel }]
    : [];

  const baseHref = `/${city.slug}/learn`;
  const visibleDisciplines = disciplines.slice(0, 8);

  return (
    <>
      <div className="container">
        <nav className="breadcrumb">
          <Link href={`/${city.slug}`}>{city.display_name}</Link>
          <span className="sep">/</span>
          <span className="ink">Learn</span>
        </nav>

        <header className="page-hdr-m md:py-7 md:px-0">
          <div className="md:flex md:items-end md:justify-between md:gap-10">
            <div>
              <div className="eyebrow tracked">{city.display_name.toUpperCase()}</div>
              <h1 className="md:!text-[44px] md:!leading-[1.04] md:!tracking-[-1.4px]">
                <span className="md:hidden">Learn a craft in </span>
                <span className="hidden md:inline">Studios &amp; academies in </span>
                <em
                  className="italic"
                  style={{ color: "rgb(var(--magenta))", fontWeight: 600 }}
                >
                  {city.display_name}
                </em>
              </h1>
              <div className="sub md:hidden">
                {totalCount} {totalCount === 1 ? "studio" : "studios & academies"} listed · free to browse
              </div>
              <div
                className="hidden md:block mt-2"
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: 16,
                  color: "rgb(var(--muted))",
                }}
              >
                <strong
                  style={{
                    fontStyle: "normal",
                    fontWeight: 700,
                    color: "rgb(var(--ink))",
                    fontSize: 22,
                    display: "block",
                    marginBottom: 2,
                  }}
                >
                  {totalCount} {totalCount === 1 ? "studio" : "studios"}
                </strong>
                and counting · classes weekly
              </div>
            </div>
            <div className="hidden md:block">
              <Link href="/list-your-profile" className="btn btn-primary btn-sm">
                List your studio
              </Link>
            </div>
          </div>
        </header>
      </div>

      <StudioFilters
        city={city.slug}
        cityDisplayName={city.display_name}
        disciplines={disciplines.map((d) => ({ slug: d.slug, display_name: d.display_name }))}
        activeDisciplineSlug={active}
        appliedFilters={appliedFilters}
        total={totalCount}
      />

      <div className="filter-bar">
        <Link href={baseHref} className={`pill${!active ? " active" : ""}`}>
          All
        </Link>
        {visibleDisciplines.map((d) => (
          <Link
            key={d.id}
            href={`${baseHref}?discipline=${d.slug}`}
            className={`pill${active === d.slug ? " active" : ""}`}
          >
            {d.display_name}
          </Link>
        ))}
        <span
          className="pill"
          style={{
            background: "rgb(var(--cream-2))",
            borderColor: "rgb(var(--mustard-dark))",
            color: "rgb(var(--mustard-dark))",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          More <ChevronDown size={12} />
        </span>
      </div>

      {studios.length === 0 ? (
        <div className="container py-8">
          <EmptyState
            variant="forest"
            glyph="✻"
            title={`No studios match these filters in ${city.display_name} yet.`}
            body="Try clearing filters, or list a studio you teach at."
            ctaLabel="List your studio"
            ctaHref="/list-your-profile"
          />
        </div>
      ) : (
        <div className="listing-grid">
          {studios.map((s, i) => (
            <StudioCard
              key={s.id}
              id={s.id}
              city={city.slug}
              slug={s.slug}
              name={s.name}
              logo_photo={s.logo_photo}
              address={s.address}
              age_group={s.age_group}
              disciplines={s.craft_disciplines.map((j) => j.discipline.display_name)}
              priority={i < 4}
            />
          ))}
        </div>
      )}

      <div className="container" style={{ padding: "6px 18px 32px", textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            color: "rgb(var(--muted))",
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          Showing {studios.length} of {totalCount} {totalCount === 1 ? "studio" : "studios"}
        </div>
        {totalCount > studios.length && (
          <Link href={`${baseHref}?page=2${active ? `&discipline=${active}` : ""}`} className="btn btn-secondary btn-block">
            Load more studios
          </Link>
        )}
      </div>

      <BottomNav city={city.slug} active="explore" />
    </>
  );
}
