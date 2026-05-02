import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, MapPin, ExternalLink, Flag } from "lucide-react";
import { formatINR } from "@/lib/util";

export const revalidate = 60;

export default async function EventDetail({ params }: { params: { city: string; slug: string } }) {
  const city = await getCityBySlug(params.city);
  if (!city) notFound();

  const e = await prisma.event.findUnique({
    where: { slug: params.slug },
    include: {
      city: true,
      organizer_crafter: true,
      organizer_store: true,
      organizer_studio: true,
      craft_category: true,
    },
  });
  if (!e || e.status !== "PUBLISHED" || e.city_id !== city.id) notFound();

  const organizerName =
    e.organizer_crafter?.name ?? e.organizer_store?.name ?? e.organizer_studio?.name ?? "Crafty community";
  const organizerHref =
    e.organizer_crafter ? `/${city.slug}/crafters/${e.organizer_crafter.slug}` :
    e.organizer_store   ? `/${city.slug}/stores/${e.organizer_store.slug}`   :
    e.organizer_studio  ? `/${city.slug}/learn/${e.organizer_studio.slug}`   : null;

  const start = new Date(e.start_at);
  const end = new Date(e.end_at);

  return (
    <article>
      <div className="relative h-72 w-full overflow-hidden bg-canvas-sunken sm:h-96">
        <img src={e.cover_image} alt={e.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas/80 to-transparent" />
      </div>

      <div className="container -mt-20 pb-16">
        <div className="card p-6 sm:p-8">
          <span className="inline-flex items-center gap-1 rounded-full bg-canvas-sunken px-2 py-1 text-xs font-semibold uppercase tracking-wider">
            {e.event_type.toLowerCase()}
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{e.name}</h1>

          <div className="mt-4 grid gap-3 text-sm text-ink-muted sm:grid-cols-2">
            <p className="flex items-center gap-1"><Calendar size={14} /> {start.toLocaleString("en-IN", { dateStyle: "full" })}</p>
            <p className="flex items-center gap-1">
              <Clock size={14} />
              {start.toLocaleTimeString("en-IN", { timeStyle: "short" })} – {end.toLocaleTimeString("en-IN", { timeStyle: "short" })}
            </p>
            <p className="flex items-center gap-1"><MapPin size={14} /> {e.venue_name}{e.venue_address ? `, ${e.venue_address}` : ""}</p>
            <p className="text-ink"><strong>{e.is_free ? "Free entry" : (e.price_amount ? formatINR(Number(e.price_amount)) : "Paid")}</strong></p>
          </div>

          <p className="mt-6 whitespace-pre-line text-base leading-relaxed">{e.description}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href={e.registration_url} target="_blank" className="btn btn-primary">
              <ExternalLink size={16} /> Register
            </a>
            {organizerHref && (
              <Link href={organizerHref} className="btn">By {organizerName} →</Link>
            )}
          </div>
        </div>

        <button className="mt-8 inline-flex items-center gap-1 text-xs text-ink-subtle hover:text-danger">
          <Flag size={12} /> Report this event
        </button>
      </div>
    </article>
  );
}
