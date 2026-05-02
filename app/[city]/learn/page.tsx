import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { StudioCard } from "@/components/Cards";
import { notFound } from "next/navigation";
import Link from "next/link";

export const revalidate = 60;

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
    where, take: 24,
    orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
    include: { craft_disciplines: { include: { discipline: true } } },
  });

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Studios &amp; academies in {city.display_name}</h1>
        <p className="mt-1 text-sm text-ink-muted">{studios.length} studios listed</p>
      </header>
      <div className="snap-rail no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href={`/${city.slug}/learn`} className="chip whitespace-nowrap" data-active={!active}>All</Link>
        {disciplines.map((d) => (
          <Link key={d.id} href={`/${city.slug}/learn?discipline=${d.slug}`} className="chip whitespace-nowrap" data-active={active === d.slug}>
            {d.display_name}
          </Link>
        ))}
      </div>
      {studios.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-canvas-sunken/40 p-12 text-center">
          <p className="text-ink-muted">No studios match these filters in {city.display_name} yet.</p>
          <Link href="/list-your-profile" className="btn btn-primary">List your studio</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {studios.map((s) => (
            <StudioCard
              key={s.id} city={city.slug} slug={s.slug} name={s.name}
              logo_photo={s.logo_photo} address={s.address} age_group={s.age_group}
              disciplines={s.craft_disciplines.map((j) => j.discipline.display_name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
