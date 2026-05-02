import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { StoreCard } from "@/components/Cards";
import { notFound } from "next/navigation";
import Link from "next/link";

export const revalidate = 60;

export default async function StoresListing({
  params, searchParams,
}: { params: { city: string }; searchParams: { category?: string } }) {
  const city = await getCityBySlug(params.city);
  if (!city) notFound();

  const cats = await prisma.supplyCategory.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } });
  const activeCat = searchParams.category;
  const where = {
    city_id: city.id,
    status: "PUBLISHED" as const,
    ...(activeCat ? { supply_categories: { some: { category: { slug: activeCat } } } } : {}),
  };
  const stores = await prisma.store.findMany({
    where, take: 24,
    orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
    include: { supply_categories: { include: { category: true } } },
  });

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Supply stores in {city.display_name}</h1>
        <p className="mt-1 text-sm text-ink-muted">{stores.length} stores listed</p>
      </header>
      <div className="snap-rail no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href={`/${city.slug}/stores`} className="chip whitespace-nowrap" data-active={!activeCat}>All</Link>
        {cats.map((c) => (
          <Link key={c.id} href={`/${city.slug}/stores?category=${c.slug}`} className="chip whitespace-nowrap" data-active={activeCat === c.slug}>
            {c.display_name}
          </Link>
        ))}
      </div>
      {stores.length === 0 ? (
        <EmptyStores city={city.display_name} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {stores.map((s) => (
            <StoreCard
              key={s.id} city={city.slug} slug={s.slug} name={s.name}
              logo_photo={s.logo_photo} address={s.address}
              categories={s.supply_categories.map((j) => j.category.display_name)}
              is_online_only={s.is_online_only} is_claimed={s.is_claimed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyStores({ city }: { city: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-canvas-sunken/40 p-12 text-center">
      <p className="text-ink-muted">No stores match these filters in {city} yet.</p>
      <Link href="/list-your-profile" className="btn btn-primary">List your store</Link>
    </div>
  );
}
