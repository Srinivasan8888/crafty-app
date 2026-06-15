import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { StudioForm } from "@/components/StudioForm";
import { DeleteListingButton } from "@/components/DeleteListingButton";
import { FeatureListingButton } from "@/components/FeatureListingButton";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function EditStudio() {
  const user = await getCurrentUser();
  if (!user) redirect("/list-your-profile");
  if (user.role === "VISITOR") redirect("/list-your-profile");

  const studio = await prisma.studio.findFirst({
    where: { owner_user_id: user.id, status: { not: "DELETED" } },
    include: { craft_disciplines: true, city: true },
  });
  if (!studio) redirect("/dashboard/studio/new");

  const [cities, disciplines] = await Promise.all([
    prisma.city.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } }),
    prisma.discipline.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Edit your studio</h1>
          <p className="mt-1 text-sm text-ink-muted">
            <Link className="underline" href={`/${studio.city.slug}/learn/${studio.slug}`}>View public page</Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FeatureListingButton entityType="STUDIO" entityId={studio.id} entityName={studio.name} />
          <DeleteListingButton endpoint={`/api/studios/${studio.id}`} kindLabel="studio" redirectTo="/dashboard" />
        </div>
      </div>
      <StudioForm
        cities={cities}
        disciplines={disciplines}
        entityId={studio.id}
        initialValues={{
          name: studio.name,
          logo_photo: studio.logo_photo,
          logo_photo_blurhash: studio.logo_photo_blurhash ?? "",
          city_id: studio.city_id,
          address: studio.address,
          is_online_only: studio.is_online_only,
          age_group: studio.age_group ?? "",
          contact_phone: studio.contact_phone ?? "",
          contact_whatsapp: studio.contact_whatsapp ?? "",
          contact_website: studio.contact_website ?? "",
          discipline_ids: studio.craft_disciplines.map((j) => j.discipline_id),
        }}
      />
    </div>
  );
}
