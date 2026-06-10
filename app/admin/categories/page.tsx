import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Kind = "craft" | "supply" | "discipline";

async function toggleActive(kind: Kind, id: string, active: boolean) {
  "use server";
  await requireAdmin();
  if (kind === "craft") await prisma.craftCategory.update({ where: { id }, data: { is_active: active } });
  if (kind === "supply") await prisma.supplyCategory.update({ where: { id }, data: { is_active: active } });
  if (kind === "discipline") await prisma.discipline.update({ where: { id }, data: { is_active: active } });
  revalidatePath("/admin/categories");
}

export default async function AdminCategoriesPage() {
  const [craft, supply, disciplines] = await Promise.all([
    prisma.craftCategory.findMany({ orderBy: { display_order: "asc" } }),
    prisma.supplyCategory.findMany({ orderBy: { display_order: "asc" } }),
    prisma.discipline.findMany({ orderBy: { display_order: "asc" } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="mt-1 text-sm text-ink-muted">PRD §24.5 — manage craft / supply / discipline taxonomies.</p>
      </div>

      <Section
        title="Craft categories"
        kind="craft"
        items={craft}
        toggle={toggleActive}
      />
      <Section
        title="Supply categories"
        kind="supply"
        items={supply}
        toggle={toggleActive}
      />
      <Section
        title="Disciplines (Learn)"
        kind="discipline"
        items={disciplines}
        toggle={toggleActive}
      />
    </div>
  );
}

function Section({
  title,
  kind,
  items,
  toggle,
}: {
  title: string;
  kind: Kind;
  items: Array<{ id: string; slug: string; display_name: string; is_active: boolean; display_order: number }>;
  toggle: (kind: Kind, id: string, active: boolean) => Promise<void>;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">{title}</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink-subtle">
            <tr>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-line">
                <td className="px-4 py-2"><code className="rounded bg-canvas-sunken px-1.5 py-0.5 text-xs">{i.slug}</code></td>
                <td className="px-4 py-2 font-medium text-ink">{i.display_name}</td>
                <td className="px-4 py-2">{i.is_active ? "yes" : <span className="text-ink-subtle">no</span>}</td>
                <td className="px-4 py-2">
                  <form action={toggle.bind(null, kind, i.id, !i.is_active)}>
                    <button className="btn btn-ghost btn-sm">{i.is_active ? "Deactivate" : "Activate"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
