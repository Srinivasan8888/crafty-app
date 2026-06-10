import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { StudioForm } from "@/components/StudioForm";
import { redirect } from "next/navigation";

export default async function NewStudio() {
  const user = await getCurrentUser();
  if (!user) redirect("/list-your-profile");
  if (user.role === "VISITOR") redirect("/list-your-profile");

  const existing = await prisma.studio.findFirst({
    where: { owner_user_id: user.id, status: { not: "DELETED" } },
    include: { city: true },
  });
  if (existing) redirect(`/${existing.city.slug}/learn/${existing.slug}`);

  const [cities, disciplines] = await Promise.all([
    prisma.city.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } }),
    prisma.discipline.findMany({ where: { is_active: true }, orderBy: { display_order: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">List your studio</h1>
      <p className="mt-1 text-sm text-ink-muted">Reach students looking for classes in your discipline.</p>
      <div className="mt-6">
        <StudioForm cities={cities} disciplines={disciplines} />
      </div>
    </div>
  );
}
