import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { EventCard } from "@/components/Cards";
import { notFound } from "next/navigation";
import Link from "next/link";

export const revalidate = 60;

const TYPES = ["WORKSHOP", "FAIR", "EXHIBITION", "CLASS", "POPUP", "OTHER"] as const;

export default async function EventsListing({
  params, searchParams,
}: { params: { city: string }; searchParams: { type?: string } }) {
  const city = await getCityBySlug(params.city);
  if (!city) notFound();

  const active = searchParams.type;
  const where = {
    city_id: city.id, status: "PUBLISHED" as const,
    end_at: { gte: new Date() },
    ...(active ? { event_type: active as any } : {}),
  };
  const events = await prisma.event.findMany({
    where, take: 24, orderBy: { start_at: "asc" },
  });

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Upcoming events in {city.display_name}</h1>
        <p className="mt-1 text-sm text-ink-muted">{events.length} events listed</p>
      </header>
      <div className="snap-rail no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href={`/${city.slug}/events`} className="chip whitespace-nowrap" data-active={!active}>All</Link>
        {TYPES.map((t) => (
          <Link key={t} href={`/${city.slug}/events?type=${t}`} className="chip whitespace-nowrap" data-active={active === t}>
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>
      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-canvas-sunken/40 p-12 text-center">
          <p className="text-ink-muted">No upcoming events in {city.display_name}.</p>
          <Link href="/list-your-profile" className="btn btn-primary">Host an event</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard
              key={e.id} city={city.slug} slug={e.slug} name={e.name}
              cover_image={e.cover_image} start_at={e.start_at} venue_name={e.venue_name}
              is_free={e.is_free} price_amount={e.price_amount?.toString()} event_type={e.event_type}
            />
          ))}
        </div>
      )}
    </div>
  );
}
