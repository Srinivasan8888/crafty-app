import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { notFound } from "next/navigation";
import { Phone, MessageCircle, Globe, MapPin, Sparkles, Mail, Flag } from "lucide-react";

export const revalidate = 60;

export default async function StoreDetail({ params }: { params: { city: string; slug: string } }) {
  const city = await getCityBySlug(params.city);
  if (!city) notFound();

  const s = await prisma.store.findUnique({
    where: { slug: params.slug },
    include: { city: true, supply_categories: { include: { category: true } } },
  });
  if (!s || s.status !== "PUBLISHED" || s.city_id !== city.id) notFound();

  const upcomingEvents = await prisma.event.findMany({
    where: { organizer_store_id: s.id, status: "PUBLISHED", end_at: { gte: new Date() } },
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {s.is_featured && (
                <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-bold">
                  <Sparkles size={12} /> Featured
                </span>
              )}
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{s.name}</h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-ink-muted">
                <MapPin size={14} /> {s.is_online_only ? "Online only" : `${s.address} · ${s.city.display_name}`}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {s.supply_categories.map((j) => (
                  <span key={j.category_id} className="rounded-full bg-canvas-sunken px-2 py-0.5 text-xs">
                    {j.category.display_name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {s.contact_phone && (
              <a href={`tel:${s.contact_phone}`} className="btn"><Phone size={16} /> Call</a>
            )}
            {s.contact_whatsapp && (
              <a href={`https://wa.me/${s.contact_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" className="btn">
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
            {s.contact_website && (
              <a href={s.contact_website} target="_blank" className="btn"><Globe size={16} /> Website</a>
            )}
          </div>

          {!s.is_claimed && (
            <div className="mt-6 rounded-xl border border-accent-soft bg-accent-soft/30 p-4 text-sm">
              <p className="font-semibold">Is this your store?</p>
              <p className="mt-1 text-ink-muted">
                <a href="mailto:hello@crafty.app?subject=Claim%20listing" className="inline-flex items-center gap-1 text-accent hover:underline">
                  <Mail size={14} /> Email hello@crafty.app to claim and manage this listing.
                </a>
              </p>
            </div>
          )}
        </div>

        {upcomingEvents.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">Events at this store</h2>
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
