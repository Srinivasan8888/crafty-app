import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CrafterForm } from "@/components/CrafterForm";
import { redirect } from "next/navigation";

export default async function NewCrafter() {
  const user = await getCurrentUser();
  if (!user) redirect("/list-your-profile");
  if (user.role === "VISITOR") redirect("/list-your-profile");

  const existing = await prisma.crafter.findFirst({
    where: { owner_user_id: user.id, status: { not: "DELETED" } },
    include: { city: true },
  });
  if (existing) redirect(`/${existing.city.slug}/crafters/${existing.slug}`);

  const [cities, categories] = await Promise.all([
    prisma.city.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } }),
    prisma.craftCategory.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Create your crafter profile</h1>
      <p className="mt-1 text-sm text-ink-muted">Takes about 5 minutes. Goes live immediately.</p>
      <div className="mt-6">
        <CrafterForm cities={cities} categories={categories} />
      </div>
    </div>
  );
}
