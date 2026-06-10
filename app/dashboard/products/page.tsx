// V3 — Seller's product list, grouped by parent listing.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatINR } from "@/lib/util";
import { DeleteListingButton } from "@/components/DeleteListingButton";
import { SafeImage } from "@/components/SafeImage";

export default async function MyProducts() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role === "VISITOR") redirect("/list-your-profile");

  const products = await prisma.product.findMany({
    where: { owner_user_id: user.id, status: { not: "DELETED" } },
    orderBy: { created_at: "desc" },
    include: {
      crafter: { select: { id: true, name: true, slug: true, city: { select: { slug: true } } } },
      store: { select: { id: true, name: true, slug: true, city: { select: { slug: true } } } },
      studio: { select: { id: true, name: true, slug: true, city: { select: { slug: true } } } },
    },
  });

  // Group by parent listing for legibility.
  type GroupKey = string; // "kind:id"
  const groups = new Map<GroupKey, { label: string; kind: string; href: string; rows: typeof products }>();
  for (const p of products) {
    let key: GroupKey, label: string, kind: string, href: string;
    if (p.crafter) {
      key = `CRAFTER:${p.crafter.id}`;
      label = p.crafter.name;
      kind = "Crafter";
      href = `/${p.crafter.city.slug}/crafters/${p.crafter.slug}`;
    } else if (p.store) {
      key = `STORE:${p.store.id}`;
      label = p.store.name;
      kind = "Store";
      href = `/${p.store.city.slug}/stores/${p.store.slug}`;
    } else if (p.studio) {
      key = `STUDIO:${p.studio.id}`;
      label = p.studio.name;
      kind = "Studio";
      href = `/${p.studio.city.slug}/learn/${p.studio.slug}`;
    } else {
      key = "ORPHAN";
      label = "Unattached";
      kind = "";
      href = "#";
    }
    if (!groups.has(key)) groups.set(key, { label, kind, href, rows: [] });
    groups.get(key)!.rows.push(p);
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your products</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Items buyers can purchase directly through Crafty.
          </p>
        </div>
        <Link href="/dashboard/products/new" className="btn btn-primary btn-sm">
          <Plus size={14} /> Add product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ink-muted">No products yet.</p>
          <Link href="/dashboard/products/new" className="btn btn-primary btn-sm mt-3">
            Add your first product
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(groups.entries()).map(([key, g]) => (
            <section key={key}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-display text-lg font-bold">
                  {g.label} <span className="text-sm font-normal text-ink-subtle">· {g.kind}</span>
                </h2>
                {g.href !== "#" && (
                  <Link href={g.href} className="text-xs text-forest hover:underline">
                    View public page →
                  </Link>
                )}
              </div>
              <ul className="grid gap-3">
                {g.rows.map((p) => (
                  <li key={p.id} className="card flex items-center gap-4 p-3 sm:p-4">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md">
                      <SafeImage
                        src={p.photos[0] ?? null}
                        alt={p.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{p.name}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {formatINR(p.price_inr)} ·{" "}
                        {p.inventory === -1 ? "Made to order" : `${p.inventory} in stock`} ·{" "}
                        {p.status.toLowerCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/products/${p.id}/edit`}
                        className="btn btn-ghost btn-sm"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil size={12} /> Edit
                      </Link>
                      <DeleteListingButton
                        endpoint={`/api/products/${p.id}`}
                        kindLabel="product"
                        redirectTo="/dashboard/products"
                        size="sm"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
