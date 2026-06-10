// V3 — Single-order seller view. Shows the seller's items in this order,
// shipping info, and a "Mark fulfilled" button that POSTs to /api/orders/[id]/fulfill.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatINR, formatDateTime } from "@/lib/util";
import { SafeImage } from "@/components/SafeImage";
import { FulfillButton } from "./FulfillButton";

export default async function SalesDetail({ params }: { params: { orderId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      buyer: { select: { display_name: true, email: true } },
      items: {
        include: {
          product: { select: { name: true, photos: true } },
        },
      },
    },
  });
  if (!order) notFound();

  // Seller-scoped view: only show items belonging to this seller (or all,
  // if the viewer is admin).
  const myItems = user.role === "ADMIN"
    ? order.items
    : order.items.filter((i) => i.seller_user_id === user.id);
  if (myItems.length === 0) notFound();

  const totalPayout = myItems.reduce((acc, i) => acc + i.seller_payout_inr, 0);
  const totalGross = myItems.reduce((acc, i) => acc + i.price_inr * i.quantity, 0);
  const canFulfill = order.status === "PAID";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {order.invoice_number ?? `Order ${order.id.slice(-6)}`}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Placed {formatDateTime(order.created_at)} · {order.status.toLowerCase()}
          </p>
        </div>
        <Link href="/dashboard/sales" className="text-sm text-forest hover:underline">
          ← All sales
        </Link>
      </div>

      <section className="card mt-6 p-4 sm:p-6">
        <h2 className="font-display text-lg font-bold">Your items</h2>
        <ul className="mt-3 divide-y divide-line">
          {myItems.map((it) => (
            <li key={it.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md">
                <SafeImage
                  src={it.product.photos[0] ?? null}
                  alt={it.product.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{it.product.name}</p>
                <p className="text-xs text-ink-muted">Qty {it.quantity} × {formatINR(it.price_inr)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatINR(it.seller_payout_inr)}</p>
                <p className="text-xs text-ink-subtle">your payout</p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Items total</dt>
            <dd>{formatINR(totalGross)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Crafty service fee (10%)</dt>
            <dd>−{formatINR(totalGross - totalPayout)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Your payout</dt>
            <dd>{formatINR(totalPayout)}</dd>
          </div>
        </dl>
      </section>

      <section className="card mt-4 p-4 sm:p-6">
        <h2 className="font-display text-lg font-bold">Ship to</h2>
        <p className="mt-2 whitespace-pre-line text-sm">
          <strong>{order.shipping_name ?? order.buyer.display_name ?? order.buyer.email}</strong>{"\n"}
          {order.shipping_address ?? "(no address on file)"}{"\n"}
          {order.shipping_phone ?? ""}
        </p>
      </section>

      {canFulfill && (
        <div className="mt-4">
          <FulfillButton orderId={order.id} itemIds={myItems.map((i) => i.id)} />
        </div>
      )}
      {!canFulfill && order.status === "FULFILLED" && (
        <p className="mt-4 text-sm text-success">Marked as fulfilled.</p>
      )}
    </div>
  );
}
