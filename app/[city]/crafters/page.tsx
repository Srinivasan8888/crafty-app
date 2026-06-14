import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { CrafterCard } from "@/components/Cards";

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const city = await getCityBySlug(params.city);
  const cityName = city?.display_name ?? params.city;
  const title = `Crafters in ${cityName} · Crafty`;
  const description = `Discover handmade artists and craft sellers across ${cityName}. Browse profiles, see portfolios, contact directly.`;
  return {
    title,
    description,
    alternates: { canonical: `/${params.city}/crafters` },
    openGraph: { title, description, type: "website", images: ["/opengraph-image"] },
  };
}
import { FeaturedCard } from "@/components/FeaturedCard";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { CrafterFilters } from "./_components/CrafterFilters";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isPro } from "@/lib/subscription-gates";

export const revalidate = 60;

export default async function CraftersListing({
  params,
  searchParams,
}: {
  params: { city: string };
  searchParams: { category?: string };
}) {
  const city = await getCityBySlug(params.city);
  if (!city) notFound();

  const categories = await prisma.craftCategory.findMany({
    where: { is_active: true },
    orderBy: { display_order: "asc" },
  });

  const activeCatSlug = searchParams.category;
  const where = {
    city_id: city.id,
    status: "PUBLISHED" as const,
    ...(activeCatSlug
      ? { craft_categories: { some: { category: { slug: activeCatSlug } } } }
      : {}),
  };

  const crafters = await prisma.crafter.findMany({
    where,
    take: 24,
    orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
    include: {
      craft_categories: { include: { category: true } },
      // V3 — surface the owner's Pro tier so cards can show the Pro pill.
      owner: { select: { subscription_tier: true, subscription_expires_at: true } },
    },
  });

  const totalCount = await prisma.crafter.count({ where });

  const activeCat = activeCatSlug
    ? categories.find((c) => c.slug === activeCatSlug)
    : undefined;

  const appliedFilters = activeCat
    ? [{ key: `category-${activeCat.slug}`, label: activeCat.display_name }]
    : [];

  const featured = crafters.find((c) => c.is_featured);
  const rest = featured ? crafters.filter((c) => c.id !== featured.id) : crafters;
  const cityHref = `/${city.slug}/crafters`;

  return (
    <>
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href={`/${city.slug}`}>{city.display_name}</Link>
          <span className="sep">/</span>
          <span className="ink">Crafters</span>
        </nav>

        <header className="page-hdr-m md:py-7 md:px-0">
          <div className="md:flex md:items-end md:justify-between md:gap-10">
            <div>
              <div className="eyebrow tracked">{city.display_name.toUpperCase()}</div>
              <h1 className="md:!text-[44px] md:!leading-[1.04] md:!tracking-[-1.4px]">
                Crafters in{" "}
                <em
                  className="italic text-magenta"
                  style={{ fontWeight: 600 }}
                >
                  {city.display_name}
                </em>
              </h1>
              <p className="sub md:text-base md:mt-3" style={{ fontStyle: "italic", fontFamily: "var(--font-display)" }}>
                {totalCount} crafters and counting. Free to browse, free to reach out.
              </p>
            </div>
            <div className="hidden md:block">
              <Link href="/list-your-profile" className="btn btn-primary">
                List your profile
              </Link>
            </div>
          </div>
        </header>
      </div>

      <CrafterFilters
        city={city.slug}
        cityDisplayName={city.display_name}
        categories={categories.map((c) => ({ slug: c.slug, display_name: c.display_name }))}
        activeCategorySlug={activeCatSlug}
        appliedFilters={appliedFilters}
        total={totalCount}
      />

      <div className="container pb-10">
        {crafters.length === 0 ? (
          <EmptyState
            title="No crafters yet"
            body={`No crafters match these filters in ${city.display_name} yet.`}
            ctaLabel="List your profile"
            ctaHref="/list-your-profile"
            variant="mustard"
          />
        ) : (
          <>
            {featured && (
              <div className="mb-5 md:mb-8">
                <FeaturedCard
                  href={`/${city.slug}/crafters/${featured.slug}`}
                  imageSrc={featured.profile_photo}
                  eyebrow={`FEATURED · ${city.display_name.toUpperCase()}`}
                  title={featured.name}
                  meta={featured.tagline ?? "Featured crafter on Crafty."}
                  primaryAction={{
                    label: "View profile",
                    href: `/${city.slug}/crafters/${featured.slug}`,
                  }}
                  secondaryAction={
                    featured.contact_whatsapp
                      ? {
                          label: "WhatsApp",
                          href: `https://wa.me/${featured.contact_whatsapp.replace(/[^0-9]/g, "")}`,
                        }
                      : undefined
                  }
                  badges={[
                    { label: "Featured this week", variant: "feat" },
                    ...(featured.offers_classes
                      ? ([{ label: "Teaches", variant: "classes" }] as const)
                      : []),
                  ]}
                  saveTarget={{ entityType: "crafter", entityId: featured.id }}
                />
              </div>
            )}

            <div className="listing-grid">
              {rest.map((c, i) => (
                <CrafterCard
                  key={c.id}
                  id={c.id}
                  city={city.slug}
                  slug={c.slug}
                  name={c.name}
                  tagline={c.tagline}
                  profile_photo={c.profile_photo}
                  categories={c.craft_categories.map((j) => j.category.display_name)}
                  is_featured={c.is_featured}
                  offers_classes={c.offers_classes}
                  owner_is_pro={isPro(c.owner)}
                  priority={i < 4}
                />
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 border-t pt-6 text-center" style={{ borderColor: "var(--line)" }}>
              <p
                className="text-sm text-muted"
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                }}
              >
                Showing {crafters.length} of {totalCount} crafters
              </p>
            </div>
          </>
        )}
      </div>

      <BottomNav city={city.slug} active="explore" />
    </>
  );
}
