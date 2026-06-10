import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ProductForm, type OwnedListing } from "@/components/ProductForm";

export default async function EditProduct({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product || product.status === "DELETED") notFound();
  if (product.owner_user_id !== user.id && user.role !== "ADMIN") redirect("/dashboard/products");

  // Even though we don't allow re-parenting on edit, we still need the
  // current parent so the form can display it (read-only context).
  const [crafters, stores, studios] = await Promise.all([
    prisma.crafter.findMany({ where: { owner_user_id: user.id, status: { not: "DELETED" } }, select: { id: true, name: true } }),
    prisma.store.findMany({ where: { owner_user_id: user.id, status: { not: "DELETED" } }, select: { id: true, name: true } }),
    prisma.studio.findMany({ where: { owner_user_id: user.id, status: { not: "DELETED" } }, select: { id: true, name: true } }),
  ]);
  const ownedListings: OwnedListing[] = [
    ...crafters.map((c) => ({ id: c.id, name: c.name, kind: "CRAFTER" as const })),
    ...stores.map((s) => ({ id: s.id, name: s.name, kind: "STORE" as const })),
    ...studios.map((s) => ({ id: s.id, name: s.name, kind: "STUDIO" as const })),
  ];

  const parent_listing =
    product.crafter_id ? { kind: "CRAFTER" as const, id: product.crafter_id } :
    product.store_id ? { kind: "STORE" as const, id: product.store_id } :
    product.studio_id ? { kind: "STUDIO" as const, id: product.studio_id } :
    null;

  return (
    <div>
      <h1 className="text-2xl font-bold">Edit product</h1>
      <div className="mt-6">
        <ProductForm
          ownedListings={ownedListings}
          entityId={product.id}
          initialValues={{
            name: product.name,
            description: product.description ?? "",
            price_inr: product.price_inr,
            inventory: product.inventory,
            photos: product.photos,
            photo_blurhashes: product.photo_blurhashes,
            parent_listing,
          }}
        />
      </div>
    </div>
  );
}
