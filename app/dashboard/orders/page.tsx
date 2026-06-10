// V3 — Buyer's order list. Most recent first.

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatINR, formatDateShort } from "@/lib/util";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Payment pending",
  PAID: "Paid",
  FULFILLED: "Fulfilled",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const orders = await prisma.order.findMany({
    where: { buyer_user_id: user.id },
    orderBy: { created_at: "desc" },
    include: {
      items: {
        include: { product: { select: { name: true, photos: true } } },
      },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Your orders</h1>
      <p className="mt-1 text-sm text-ink-muted">Receipts and fulfillment status for everything you&apos;ve bought.</p>

      {orders.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="text-ink-muted">No orders yet.</p>
          <Link href="/" className="btn btn-primary btn-sm mt-3">Browse Crafty</Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/dashboard/orders/${o.id}`} className="card block p-4 hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">
                      {o.invoice_number ?? `Order ${o.id.slice(-6)}`}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {formatDateShort(o.created_at)} · {o.items.length} item{o.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatINR(o.total_inr)}</p>
                    <p className="text-xs text-ink-muted">{STATUS_LABEL[o.status] ?? o.status}</p>
                  </div>
                </div>
                <p className="mt-2 truncate text-xs text-ink-subtle">
                  {o.items.map((it) => it.product.name).join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
