import { cache } from "react";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getCityBySlug } from "@/lib/cities";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Instagram, MessageCircle, Globe, MapPin, Sparkles, Flag } from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 60;

// Issue 4.x: cache the loader so generateMetadata + the page render share one Prisma round-trip.
const loadCrafter = cache(async (citySlug: string, slug: string) => {
  const city = await getCityBySlug(citySlug);
  if (!city) return null;
  const crafter = await prisma.crafter.findUnique({
    where: { slug },
    include: {
      city: true,
      craft_categories: { include: { category: true } },
      owner: true,
    },
  });
  if (!crafter || crafter.status !== "PUBLISHED" || crafter.city_id !== city.id) {
    // Issue 1.5 — slug redirect lookup
    const redirected = await prisma.slugRedirect.findUnique({
      where: { entity_type_old_slug: { entity_type: "crafter", old_slug: slug } },
    }).catch(() => null);
    if (redirected) {
      redirect(`/${citySlug}/crafters/${redirected.new_slug}`);
    }
    return null;
  }
  return crafter;
});

export async function generateMetadata({ params }: { params: { city: string; slug: string } }): Promise<Metadata> {
  const c = await loadCrafter(params.city, params.slug);
  if (!c) return {};
  return {
    title: `${c.name} — Crafty`,
    description: c.tagline ?? c.bio ?? `${c.name} on Crafty`,
    openGraph: { images: [c.profile_photo], title: c.name, description: c.tagline ?? "" },
  };
}

export default async function CrafterDetail({ params }: { params: { city: string; slug: string } }) {
  const c = await loadCrafter(params.city, params.slug);
  if (!c) notFound();

  // All dependent queries in a single Promise.all so they run in parallel.
  const [otherStore, otherStudio, upcomingEvents] = await Promise.all([
    prisma.store.findFirst({ where: { owner_user_id: c.owner_user_id, status: "PUBLISHED" } }),
    prisma.studio.findFirst({ where: { owner_user_id: c.owner_user_id, status: "PUBLISHED" } }),
    prisma.event.findMany({
      where: {
        organizer_crafter_id: c.id,
        status: "PUBLISHED",
        end_at: { gte: new Date() },
      },
      orderBy: { start_at: "asc" },
      take: 6,
    }),
  ]);

  return (
    <article>
      {/* Hero */}
      <div className="relative h-64 w-full overflow-hidden bg-canvas-sunken sm:h-80 md:h-96">
        <Image
          src={c.profile_photo}
          alt={c.name}
          fill
          sizes="100vw"
          priority
          fetchPriority="high"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas/80 to-transparent" />
      </div>

      <div className="container -mt-20 pb-16">
        <div className="card relative p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {c.is_featured && (
                <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-bold">
                  <Sparkles size={12} /> Featured crafter
                </span>
              )}
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{c.name}</h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-ink-muted">
                <MapPin size={14} /> {c.city.display_name}
                {c.offers_classes && (
                  <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold">
                    Teaches
                  </span>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {c.craft_categories.map((j) => (
                  <span key={j.category_id} className="rounded-full bg-canvas-sunken px-2 py-0.5 text-xs">
                    {j.category.display_name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <SaveButton entityType="CRAFTER" entityId={c.id} />
            </div>
          </div>

          {c.tagline && <p className="mt-6 text-lg italic text-ink-muted">&ldquo;{c.tagline}&rdquo;</p>}

          {/* Contact CTAs */}
          <div className="mt-6 flex flex-wrap gap-2">
            {c.contact_whatsapp && (
              <a href={`https://wa.me/${c.contact_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" className="btn">
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
            {c.contact_instagram && (
              <a href={`https://instagram.com/${c.contact_instagram.replace(/^@/, "")}`} target="_blank" className="btn">
                <Instagram size={16} /> Instagram
              </a>
            )}
            {c.contact_website && (
              <a href={c.contact_website} target="_blank" className="btn">
                <Globe size={16} /> Website
              </a>
            )}
          </div>
        </div>

        {/* Bio + Portfolio */}
        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {c.bio && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">About</h2>
                <p className="mt-3 whitespace-pre-line text-base leading-relaxed">{c.bio}</p>
              </section>
            )}
            {c.portfolio_photos.length > 0 && (
              <section className="mt-10">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">Portfolio</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {c.portfolio_photos.map((url, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-canvas-sunken">
                      <Image
                        src={url}
                        alt={`${c.name} portfolio ${i + 1}`}
                        fill
                        sizes="(max-width:640px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
            {upcomingEvents.length > 0 && (
              <section className="mt-10">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">Upcoming events</h2>
                <ul className="mt-3 space-y-3">
                  {upcomingEvents.map((e) => (
                    <li key={e.id} className="card p-4">
                      <Link href={`/${c.city.slug}/events/${e.slug}`} className="font-semibold hover:text-accent">{e.name}</Link>
                      <p className="text-sm text-ink-muted">
                        {new Date(e.start_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        {" · "}
                        {e.venue_name}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            {(otherStore || otherStudio) && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold">Also runs</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {otherStore && (
                    <li><Link href={`/${c.city.slug}/stores/${otherStore.slug}`} className="text-accent hover:underline">{otherStore.name} →</Link></li>
                  )}
                  {otherStudio && (
                    <li><Link href={`/${c.city.slug}/learn/${otherStudio.slug}`} className="text-accent hover:underline">{otherStudio.name} →</Link></li>
                  )}
                </ul>
              </div>
            )}
            <div className="card p-5">
              <h3 className="text-sm font-semibold">Listing</h3>
              <dl className="mt-2 space-y-1 text-sm text-ink-muted">
                <div className="flex justify-between"><dt>Joined</dt><dd>{c.created_at.toLocaleDateString("en-IN")}</dd></div>
                <div className="flex justify-between"><dt>Status</dt><dd>{c.is_claimed ? "Claimed" : "Unclaimed"}</dd></div>
              </dl>
              <button className="mt-4 inline-flex items-center gap-1 text-xs text-ink-subtle hover:text-danger">
                <Flag size={12} /> Report this listing
              </button>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}

function SaveButton({ entityType, entityId }: { entityType: string; entityId: string }) {
  // Server-only stub for V1; full client-side implementation comes after auth wiring.
  return (
    <form action={`/api/saves`} method="post">
      <input type="hidden" name="entity_type" value={entityType} />
      <input type="hidden" name="entity_id" value={entityId} />
      <button className="btn btn-sm" type="submit">♡ Save</button>
    </form>
  );
}
