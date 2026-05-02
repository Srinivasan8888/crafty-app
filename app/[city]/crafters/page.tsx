import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { CrafterCard } from "@/components/Cards";
import { notFound } from "next/navigation";
import Link from "next/link";

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
    include: { craft_categories: { include: { category: true } } },
  });

  return (
    <div className="container py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Crafters in {city.display_name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {crafters.length} {crafters.length === 1 ? "crafter" : "crafters"} listed
          </p>
        </div>
        <Link href="/list-your-profile" className="btn btn-primary btn-sm hidden sm:inline-flex">
          List your profile
        </Link>
      </header>

      {/* Filter chips */}
      <div className="snap-rail no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link
          href={`/${city.slug}/crafters`}
          className="chip whitespace-nowrap"
          data-active={!activeCatSlug}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/${city.slug}/crafters?category=${c.slug}`}
            className="chip whitespace-nowrap"
            data-active={activeCatSlug === c.slug}
          >
            {c.display_name}
          </Link>
        ))}
      </div>

      {crafters.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-canvas-sunken/40 p-12 text-center">
          <p className="text-ink-muted">
            No crafters match these filters in {city.display_name} yet.
          </p>
          <Link href="/list-your-profile" className="btn btn-primary">List your profile</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {crafters.map((c) => (
            <CrafterCard
              key={c.id}
              city={city.slug}
              slug={c.slug}
              name={c.name}
              tagline={c.tagline}
              profile_photo={c.profile_photo}
              categories={c.craft_categories.map((j) => j.category.display_name)}
              is_featured={c.is_featured}
              offers_classes={c.offers_classes}
            />
          ))}
        </div>
      )}
    </div>
  );
}
