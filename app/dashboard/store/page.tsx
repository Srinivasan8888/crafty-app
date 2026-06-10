import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { StoreForm } from "@/components/StoreForm";
import { DeleteListingButton } from "@/components/DeleteListingButton";
import { FeatureListingButton } from "@/components/FeatureListingButton";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function EditStore() {
  const user = await getCurrentUser();
  if (!user) redirect("/list-your-profile");
  if (user.role === "VISITOR") redirect("/list-your-profile");

  const store = await prisma.store.findFirst({
    where: { owner_user_id: user.id, status: { not: "DELETED" } },
    include: { supply_categories: true, city: true },
  });
  if (!store) redirect("/dashboard/store/new");

  const [cities, categories] = await Promise.all([
    prisma.city.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } }),
    prisma.supplyCategory.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Edit your store</h1>
          <p className="mt-1 text-sm text-ink-muted">
            <Link className="underline" href={`/${store.city.slug}/stores/${store.slug}`}>View public page</Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FeatureListingButton entityType="STORE" entityId={store.id} entityName={store.name} />
          <DeleteListingButton endpoint={`/api/stores/${store.id}`} kindLabel="store" redirectTo="/dashboard" />
        </div>
      </div>
      <StoreForm
        cities={cities}
        categories={categories}
        entityId={store.id}
        initialValues={{
          name: store.name,
          logo_photo: store.logo_photo,
          city_id: store.city_id,
          address: store.address,
          is_online_only: store.is_online_only,
          contact_phone: store.contact_phone ?? "",
          contact_whatsapp: store.contact_whatsapp ?? "",
          contact_website: store.contact_website ?? "",
          category_ids: store.supply_categories.map((j) => j.category_id),
        }}
      />
    </div>
  );
}
