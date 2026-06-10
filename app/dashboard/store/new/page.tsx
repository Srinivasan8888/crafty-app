import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { StoreForm } from "@/components/StoreForm";
import { redirect } from "next/navigation";

export default async function NewStore() {
  const user = await getCurrentUser();
  if (!user) redirect("/list-your-profile");
  if (user.role === "VISITOR") redirect("/list-your-profile");

  const existing = await prisma.store.findFirst({
    where: { owner_user_id: user.id, status: { not: "DELETED" } },
    include: { city: true },
  });
  if (existing) redirect(`/${existing.city.slug}/stores/${existing.slug}`);

  const [cities, categories] = await Promise.all([
    prisma.city.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } }),
    prisma.supplyCategory.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">List your supply store</h1>
      <p className="mt-1 text-sm text-ink-muted">Be findable when buyers search for supplies in your city.</p>
      <div className="mt-6">
        <StoreForm cities={cities} categories={categories} />
      </div>
    </div>
  );
}
