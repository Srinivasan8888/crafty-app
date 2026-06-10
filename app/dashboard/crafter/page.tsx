import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CrafterForm } from "@/components/CrafterForm";
import { DeleteListingButton } from "@/components/DeleteListingButton";
import { FeatureListingButton } from "@/components/FeatureListingButton";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function EditCrafter() {
  const user = await getCurrentUser();
  if (!user) redirect("/list-your-profile");
  if (user.role === "VISITOR") redirect("/list-your-profile");

  const crafter = await prisma.crafter.findFirst({
    where: { owner_user_id: user.id, status: { not: "DELETED" } },
    include: {
      craft_categories: { include: { category: true } },
      city: true,
    },
  });
  if (!crafter) redirect("/dashboard/crafter/new");

  const [cities, categories] = await Promise.all([
    prisma.city.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } }),
    prisma.craftCategory.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Edit your crafter profile</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Changes go live immediately. <Link className="underline" href={`/${crafter.city.slug}/crafters/${crafter.slug}`}>View public page</Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FeatureListingButton entityType="CRAFTER" entityId={crafter.id} entityName={crafter.name} />
          <DeleteListingButton
            endpoint={`/api/crafters/${crafter.id}`}
            kindLabel="crafter profile"
            redirectTo="/dashboard"
          />
        </div>
      </div>
      <CrafterForm
        cities={cities}
        categories={categories}
        entityId={crafter.id}
        initialValues={{
          name: crafter.name,
          tagline: crafter.tagline ?? "",
          bio: crafter.bio ?? "",
          city_id: crafter.city_id,
          profile_photo: crafter.profile_photo,
          portfolio_photos: crafter.portfolio_photos,
          contact_whatsapp: crafter.contact_whatsapp ?? "",
          contact_instagram: crafter.contact_instagram ?? "",
          contact_website: crafter.contact_website ?? "",
          offers_classes: crafter.offers_classes,
          category_ids: crafter.craft_categories.map((j) => j.category_id),
        }}
      />
    </div>
  );
}
