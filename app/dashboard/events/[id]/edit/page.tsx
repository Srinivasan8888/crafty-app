import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { EventForm } from "@/components/EventForm";
import { DeleteListingButton } from "@/components/DeleteListingButton";
import { FeatureListingButton } from "@/components/FeatureListingButton";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

function toLocalDatetime(d: Date): string {
  // Convert Date → "YYYY-MM-DDTHH:mm" suitable for <input type="datetime-local">
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditEvent({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/list-your-profile");
  if (user.role === "VISITOR") redirect("/list-your-profile");

  const ev = await prisma.event.findUnique({
    where: { id: params.id },
    include: { city: true },
  });
  if (!ev || ev.status === "DELETED") notFound();
  if (ev.organizer_user_id !== user.id && user.role !== "ADMIN") notFound();

  const [crafters, stores, studios, cities, categories] = await Promise.all([
    prisma.crafter.findMany({
      where: { owner_user_id: user.id, status: { not: "DELETED" } },
      select: { id: true, name: true },
    }),
    prisma.store.findMany({
      where: { owner_user_id: user.id, status: { not: "DELETED" } },
      select: { id: true, name: true },
    }),
    prisma.studio.findMany({
      where: { owner_user_id: user.id, status: { not: "DELETED" } },
      select: { id: true, name: true },
    }),
    prisma.city.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } }),
    prisma.craftCategory.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } }),
  ]);

  const ownedListings = [
    ...crafters.map((c) => ({ id: c.id, name: c.name, kind: "CRAFTER" as const })),
    ...stores.map((s) => ({ id: s.id, name: s.name, kind: "STORE" as const })),
    ...studios.map((s) => ({ id: s.id, name: s.name, kind: "STUDIO" as const })),
  ];

  const currentOrganizer = ev.organizer_crafter_id
    ? `CRAFTER:${ev.organizer_crafter_id}`
    : ev.organizer_store_id
      ? `STORE:${ev.organizer_store_id}`
      : ev.organizer_studio_id
        ? `STUDIO:${ev.organizer_studio_id}`
        : "";

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Edit event</h1>
          <p className="mt-1 text-sm text-ink-muted">
            <Link className="underline" href={`/${ev.city.slug}/events/${ev.slug}`}>View public page</Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FeatureListingButton entityType="EVENT" entityId={ev.id} entityName={ev.name} />
          <DeleteListingButton endpoint={`/api/events/${ev.id}`} kindLabel="event" redirectTo="/dashboard/events" />
        </div>
      </div>
      <EventForm
        cities={cities}
        categories={categories}
        ownedListings={ownedListings}
        entityId={ev.id}
        initialValues={{
          name: ev.name,
          description: ev.description,
          cover_image: ev.cover_image,
          organizer: currentOrganizer,
          start_at: toLocalDatetime(ev.start_at),
          end_at: toLocalDatetime(ev.end_at),
          city_id: ev.city_id,
          venue_name: ev.venue_name,
          venue_address: ev.venue_address ?? "",
          is_online: ev.is_online,
          event_type: ev.event_type,
          craft_category_id: ev.craft_category_id ?? "",
          is_free: ev.is_free,
          price_amount: ev.price_amount ? String(ev.price_amount) : "",
          registration_url: ev.registration_url,
        }}
      />
    </div>
  );
}
