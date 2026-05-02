import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { notFound } from "next/navigation";
import { Phone, MessageCircle, Globe, MapPin, Mail, Flag } from "lucide-react";

export const revalidate = 60;

export default async function StudioDetail({ params }: { params: { city: string; slug: string } }) {
  const city = await getCityBySlug(params.city);
  if (!city) notFound();

  const s = await prisma.studio.findUnique({
    where: { slug: params.slug },
    include: { city: true, craft_disciplines: { include: { discipline: true } } },
  });
  if (!s || s.status !== "PUBLISHED" || s.city_id !== city.id) notFound();

  const upcomingEvents = await prisma.event.findMany({
    where: { organizer_studio_id: s.id, status: "PUBLISHED", end_at: { gte: new Date() } },
    orderBy: { start_at: "asc" }, take: 6,
  });

  return (
    <article>
      <div className="relative h-64 w-full overflow-hidden bg-canvas-sunken sm:h-80">
        <img src={s.logo_photo} alt={s.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas/80 to-transparent" />
      </div>

      <div className="container -mt-20 pb-16">
        <div className="card p-6 sm:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{s.name}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-ink-muted">
            <MapPin size={14} /> {s.is_online_only ? "Online studio" : `${s.address} · ${s.city.display_name}`}
            {s.age_group && (
              <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold">{s.age_group}</span>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {s.craft_disciplines.map((j) => (
              <span key={j.discipline_id} className="rounded-full bg-canvas-sunken px-2 py-0.5 text-xs">
                {j.discipline.display_name}
              </span>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {s.contact_phone && <a href={`tel:${s.contact_phone}`} className="btn"><Phone size={16} /> Call</a>}
            {s.contact_whatsapp && (
              <a href={`https://wa.me/${s.contact_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" className="btn">
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
            {s.contact_website && <a href={s.contact_website} target="_blank" className="btn"><Globe size={16} /> Website</a>}
          </div>
          {!s.is_claimed && (
            <div className="mt-6 rounded-xl border border-accent-soft bg-accent-soft/30 p-4 text-sm">
              <p className="font-semibold">Is this your studio?</p>
              <a href="mailto:hello@crafty.app?subject=Claim%20listing" className="mt-1 inline-flex items-center gap-1 text-accent hover:underline">
                <Mail size={14} /> Email hello@crafty.app to claim it.
              </a>
            </div>
          )}
        </div>

        {upcomingEvents.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">Upcoming classes &amp; events</h2>
            <ul className="mt-3 space-y-3">
              {upcomingEvents.map((e) => (
                <li key={e.id} className="card p-4">
                  <a href={`/${s.city.slug}/events/${e.slug}`} className="font-semibold hover:text-accent">{e.name}</a>
                  <p className="text-sm text-ink-muted">
                    {new Date(e.start_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {e.venue_name}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button className="mt-8 inline-flex items-center gap-1 text-xs text-ink-subtle hover:text-danger">
          <Flag size={12} /> Report this listing
        </button>
      </div>
    </article>
  );
}
