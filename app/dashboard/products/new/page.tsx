import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ProductForm, type OwnedListing } from "@/components/ProductForm";

export default async function NewProduct() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role === "VISITOR") redirect("/list-your-profile");

  const [crafters, stores, studios] = await Promise.all([
    prisma.crafter.findMany({
      where: { owner_user_id: user.id, status: { not: "DELETED" } },
      select: { id: true, name: true },
    }),
    prisma.store.findMany({
      where: { owner_user_id: user.id, status: { not: "DELETED" } },
      select: { id: true, name: true },
    }),
    prisma.studio.findMany({
      where: { owner_user_id: user.id, status: { not: "DELETED" } },
      select: { id: true, name: true },
    }),
  ]);

  const ownedListings: OwnedListing[] = [
    ...crafters.map((c) => ({ id: c.id, name: c.name, kind: "CRAFTER" as const })),
    ...stores.map((s) => ({ id: s.id, name: s.name, kind: "STORE" as const })),
    ...studios.map((s) => ({ id: s.id, name: s.name, kind: "STUDIO" as const })),
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Add a product</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Photos + price + a short description. Buyers check out on Crafty.
      </p>
      <div className="mt-6">
        <ProductForm ownedListings={ownedListings} />
      </div>
    </div>
  );
}
