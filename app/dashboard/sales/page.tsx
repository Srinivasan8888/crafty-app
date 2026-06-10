// V3 — Seller's sales list. Groups OrderItems they own by Order, sorted
// by most recent. Only shows orders that have been PAID or beyond — pending
// orders aren't actionable for the seller.

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatINR, formatDateShort } from "@/lib/util";

const STATUS_LABEL: Record<string, string> = {
  PAID: "Awaiting fulfillment",
  FULFILLED: "Fulfilled",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

export default async function SalesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role === "VISITOR") redirect("/list-your-profile");

  const items = await prisma.orderItem.findMany({
    where: {
      seller_user_id: user.id,
      order: { status: { in: ["PAID", "FULFILLED", "REFUNDED"] } },
    },
    orderBy: { order: { created_at: "desc" } },
    include: {
      order: { select: { id: true, status: true, created_at: true, invoice_number: true, shipping_name: true } },
      product: { select: { name: true, photos: true } },
    },
  });

  // Group by order_id.
  const byOrder = new Map<string, typeof items>();
  for (const it of items) {
    if (!byOrder.has(it.order.id)) byOrder.set(it.order.id, []);
    byOrder.get(it.order.id)!.push(it);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Your sales</h1>
      <p className="mt-1 text-sm text-ink-muted">Orders for products you sell on Crafty.</p>

      {byOrder.size === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="text-ink-muted">No sales yet.</p>
          <Link href="/dashboard/products" className="btn btn-primary btn-sm mt-3">
            Manage products
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {Array.from(byOrder.entries()).map(([orderId, lines]) => {
            const order = lines[0].order;
            const itemCount = lines.reduce((acc, l) => acc + l.quantity, 0);
            const totalPayout = lines.reduce((acc, l) => acc + l.seller_payout_inr, 0);
            return (
              <li key={orderId}>
                <Link
                  href={`/dashboard/sales/${orderId}`}
                  className="card block p-4 hover:-translate-y-0.5 transition-transform"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">
                        {order.invoice_number ?? `Order ${order.id.slice(-6)}`}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {formatDateShort(order.created_at)} · {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
                        {order.shipping_name ?? "ship-to unknown"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatINR(totalPayout)}</p>
                      <p className="text-xs text-ink-muted">{STATUS_LABEL[order.status] ?? order.status}</p>
                    </div>
                  </div>
                  <p className="mt-2 truncate text-xs text-ink-subtle">
                    {lines.map((l) => l.product.name).join(" · ")}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
