import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { StoreCard } from "@/components/Cards";

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const city = await getCityBySlug(params.city);
  const cityName = city?.display_name ?? params.city;
  const title = `Supply stores in ${cityName} — Crafty`;
  const description = `Yarn, fabric, beads, tools — find craft supply stores across ${cityName}. Address, hours, contact info.`;
  return {
    title,
    description,
    alternates: { canonical: `/${params.city}/stores` },
    openGraph: { title, description, type: "website" },
  };
}
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { StoreFilters, type AppliedFilter } from "./_components/Filters";
import { isPro } from "@/lib/subscription-gates";

export const revalidate = 60;

const PAGE_SIZE = 24;

export default async function StoresListing({
  params, searchParams,
}: { params: { city: string }; searchParams: { category?: string } }) {
  const city = await getCityBySlug(params.city);
  if (!city) notFound();

  const cats = await prisma.supplyCategory.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } });
  const activeCat = searchParams.category;
  const isOnlineFilter = activeCat === "online";
  const where = {
    city_id: city.id,
    status: "PUBLISHED" as const,
    ...(isOnlineFilter
      ? { is_online_only: true }
      : activeCat
        ? { supply_categories: { some: { category: { slug: activeCat } } } }
        : {}),
  };
  const stores = await prisma.store.findMany({
    where, take: PAGE_SIZE,
    orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
    include: {
      supply_categories: { include: { category: true } },
      // V3 — owner Pro tier for the Pro pill on cards.
      owner: { select: { subscription_tier: true, subscription_expires_at: true } },
    },
  });

  const totalCount = await prisma.store.count({ where });

  const activeCatLabel = isOnlineFilter
    ? "Online only"
    : activeCat
      ? cats.find((c) => c.slug === activeCat)?.display_name
      : undefined;
  const appliedFilters: AppliedFilter[] = activeCatLabel
    ? [{ key: `category:${activeCat}`, label: activeCatLabel }]
    : [];

  const baseHref = `/${city.slug}/stores`;
  const visibleCats = cats.slice(0, 7);

  return (
    <>
      <div className="container">
        <nav className="breadcrumb">
          <Link href={`/${city.slug}`}>{city.display_name}</Link>
          <span className="sep">/</span>
          <span className="ink">Stores</span>
        </nav>

        <header className="page-hdr-m md:py-7 md:px-0">
          <div className="md:flex md:items-end md:justify-between md:gap-10">
            <div>
              <div className="eyebrow tracked">{city.display_name.toUpperCase()}</div>
              <h1 className="md:!text-[44px] md:!leading-[1.04] md:!tracking-[-1.4px]">
                Supply stores in{" "}
                <em
                  className="italic"
                  style={{ color: "rgb(var(--magenta))", fontWeight: 600 }}
                >
                  {city.display_name}
                </em>
              </h1>
              <div className="sub md:hidden">
                {totalCount} {totalCount === 1 ? "store" : "stores"} listed · free to browse
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
                  {totalCount} {totalCount === 1 ? "store" : "stores"}
                </strong>
                and counting · free to browse
              </div>
            </div>
            <div className="hidden md:block">
              <Link href="/list-your-profile" className="btn btn-primary btn-sm">
                List your store
              </Link>
            </div>
          </div>
        </header>
      </div>

      <StoreFilters
        city={city.slug}
        cityDisplayName={city.display_name}
        categories={cats.map((c) => ({ slug: c.slug, display_name: c.display_name }))}
        activeCategorySlug={activeCat}
        appliedFilters={appliedFilters}
        total={totalCount}
      />

      <div className="filter-bar">
        <Link href={baseHref} className={`pill${!activeCat ? " active" : ""}`}>
          All
        </Link>
        {visibleCats.map((c) => (
          <Link
            key={c.id}
            href={`${baseHref}?category=${c.slug}`}
            className={`pill${activeCat === c.slug ? " active" : ""}`}
          >
            {c.display_name}
          </Link>
        ))}
        <Link
          href={`${baseHref}?category=online`}
          className={`pill${activeCat === "online" ? " active" : ""}`}
        >
          Online only
        </Link>
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

      {stores.length === 0 ? (
        <div className="container py-8">
          <EmptyState
            variant="mustard"
            glyph="❋"
            title={`No stores match these filters in ${city.display_name} yet.`}
            body="Try clearing filters, or list a store you know."
            ctaLabel="List your store"
            ctaHref="/list-your-profile"
          />
        </div>
      ) : (
        <div className="listing-grid">
          {stores.map((s, i) => (
            <StoreCard
              key={s.id}
              id={s.id}
              city={city.slug}
              slug={s.slug}
              name={s.name}
              logo_photo={s.logo_photo}
              address={s.address}
              categories={s.supply_categories.map((j) => j.category.display_name)}
              is_online_only={s.is_online_only}
              is_claimed={s.is_claimed}
              owner_is_pro={isPro(s.owner)}
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
          Showing {stores.length} of {totalCount} {totalCount === 1 ? "store" : "stores"}
        </div>
      </div>

      <BottomNav city={city.slug} active="explore" />
    </>
  );
}
