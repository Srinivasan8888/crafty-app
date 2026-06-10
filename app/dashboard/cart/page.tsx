// V3 — Cart page. Displays the buyer's cart and a Checkout CTA.

import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatINR } from "@/lib/util";
import { SafeImage } from "@/components/SafeImage";
import { CartLineControls } from "./CartLineControls";
import { CheckoutButton } from "@/components/CheckoutButton";

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const items = await prisma.cartItem.findMany({
    where: { buyer_user_id: user.id },
    orderBy: { created_at: "desc" },
    include: {
      product: {
        select: {
          id: true, name: true, price_inr: true, photos: true,
          inventory: true, status: true,
        },
      },
    },
  });

  const live = items.filter((i) => i.product.status === "PUBLISHED");
  const subtotal = live.reduce((acc, i) => acc + i.product.price_inr * i.quantity, 0);

  if (live.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Your cart</h1>
        <div className="card mt-6 p-8 text-center">
          <ShoppingBag className="mx-auto text-ink-muted" size={32} />
          <p className="mt-3 text-ink-muted">Your cart is empty.</p>
          <Link href="/" className="btn btn-primary btn-sm mt-3">
            Browse Crafty
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Your cart</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {live.length} item{live.length === 1 ? "" : "s"} · paying through Razorpay.
      </p>

      <ul className="mt-6 grid gap-3">
        {live.map((i) => (
          <li key={i.id} className="card flex items-center gap-4 p-3 sm:p-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
              <SafeImage
                src={i.product.photos[0] ?? null}
                alt={i.product.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{i.product.name}</p>
              <p className="text-xs text-ink-muted">{formatINR(i.product.price_inr)} each</p>
            </div>
            <CartLineControls
              productId={i.product.id}
              quantity={i.quantity}
              inventory={i.product.inventory}
            />
            <div className="w-20 text-right font-semibold">
              {formatINR(i.product.price_inr * i.quantity)}
            </div>
          </li>
        ))}
      </ul>

      <div className="card mt-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-muted">Subtotal</span>
          <span className="text-lg font-semibold">{formatINR(subtotal)}</span>
        </div>
        <p className="mt-2 text-xs text-ink-subtle">
          Shipping calculated by sellers separately. We&apos;ll send invoices on payment.
        </p>
        <div className="mt-4">
          <CheckoutButton totalInr={subtotal} />
        </div>
      </div>
    </div>
  );
}
