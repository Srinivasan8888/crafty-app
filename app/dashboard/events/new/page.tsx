import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { EventForm } from "@/components/EventForm";
import { redirect } from "next/navigation";

export default async function NewEvent() {
  const user = await getCurrentUser();
  if (!user) redirect("/list-your-profile");
  if (user.role === "VISITOR") redirect("/list-your-profile");

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

  return (
    <div>
      <h1 className="text-2xl font-bold">Host an event</h1>
      <p className="mt-1 text-sm text-ink-muted">Workshops, fairs, pop-ups, classes — linked to one of your listings.</p>
      <div className="mt-6">
        <EventForm cities={cities} categories={categories} ownedListings={ownedListings} />
      </div>
    </div>
  );
}
