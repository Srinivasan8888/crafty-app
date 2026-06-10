import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { CommunityMomentForm } from "./moment-form";

export const dynamic = "force-dynamic";

async function toggleCityActive(id: string, active: boolean) {
  "use server";
  await requireAdmin();
  await prisma.city.update({ where: { id }, data: { is_active: active } });
  revalidatePath("/admin/cities");
  revalidatePath("/");
}

async function reorderCity(id: string, delta: number) {
  "use server";
  await requireAdmin();
  const c = await prisma.city.findUnique({ where: { id }, select: { display_order: true } });
  if (!c) return;
  await prisma.city.update({ where: { id }, data: { display_order: c.display_order + delta } });
  revalidatePath("/admin/cities");
}

export default async function AdminCitiesPage() {
  const cities = await prisma.city.findMany({
    orderBy: [{ display_order: "asc" }, { display_name: "asc" }],
    include: { _count: { select: { crafters: true, stores: true, studios: true, events: true } } },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Cities</h1>
        <p className="mt-1 text-sm text-ink-muted">PRD §24.5 — toggle is_active controls homepage selector visibility.</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink-subtle">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Listings</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((c) => {
              const total = c._count.crafters + c._count.stores + c._count.studios + c._count.events;
              return (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-4 py-3 text-ink-muted">{c.display_order}</td>
                  <td className="px-4 py-3"><code className="rounded bg-canvas-sunken px-1.5 py-0.5 text-xs">{c.slug}</code></td>
                  <td className="px-4 py-3 font-medium text-ink">{c.display_name}</td>
                  <td className="px-4 py-3 text-ink-muted">{total}</td>
                  <td className="px-4 py-3">
                    {c.is_active ? <span className="text-success">yes</span> : <span className="text-ink-subtle">no</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <form action={toggleCityActive.bind(null, c.id, !c.is_active)}>
                        <button className="btn btn-ghost btn-sm">{c.is_active ? "Deactivate" : "Activate"}</button>
                      </form>
                      <form action={reorderCity.bind(null, c.id, -1)}>
                        <button className="btn btn-ghost btn-sm" aria-label="Move up">↑</button>
                      </form>
                      <form action={reorderCity.bind(null, c.id, 1)}>
                        <button className="btn btn-ghost btn-sm" aria-label="Move down">↓</button>
                      </form>
                    </div>
                    <CommunityMomentForm
                      cityId={c.id}
                      initialPhotoUrl={(c.community_moment as any)?.photoUrl ?? ""}
                      initialCaption={(c.community_moment as any)?.caption ?? ""}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
