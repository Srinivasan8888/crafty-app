// V3 — Order detail (buyer view). Receipt + status timeline.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatINR, formatDateTime } from "@/lib/util";
import { SafeImage } from "@/components/SafeImage";

const STAGES: Array<{ key: string; label: string }> = [
  { key: "PENDING",   label: "Order placed" },
  { key: "PAID",      label: "Payment captured" },
  { key: "FULFILLED", label: "Shipped" },
];

function stageReached(current: string, key: string): boolean {
  const order = ["PENDING", "PAID", "FULFILLED"];
  const a = order.indexOf(key);
  const b = order.indexOf(current);
  return a >= 0 && b >= 0 && b >= a;
}

export default async function OrderDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { welcome?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          product: { select: { name: true, photos: true, slug: true } },
          seller: { select: { display_name: true, email: true } },
        },
      },
    },
  });
  if (!order) notFound();
  if (order.buyer_user_id !== user.id && user.role !== "ADMIN") notFound();

  const isWelcome = searchParams.welcome === "1";

  return (
    <div>
      {isWelcome && order.status === "PENDING" && (
        <div className="card mb-4 border-mustard bg-mustard/10 p-4">
          <p className="text-sm">
            Thanks! We&apos;re waiting on Razorpay to confirm payment — this page
            will update automatically once we hear back (usually under a minute).
          </p>
        </div>
      )}
      {isWelcome && order.status === "PAID" && (
        <div className="card mb-4 border-success bg-success/10 p-4">
          <p className="text-sm font-semibold text-success">Payment confirmed — thank you!</p>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {order.invoice_number ?? `Order ${order.id.slice(-6)}`}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Placed {formatDateTime(order.created_at)}
          </p>
        </div>
        <Link href="/dashboard/orders" className="text-sm text-forest hover:underline">
          ← All orders
        </Link>
      </div>

      <section className="card mt-6 p-4 sm:p-6">
        <h2 className="font-display text-lg font-bold">Status</h2>
        <ol className="mt-3 space-y-2">
          {STAGES.map((s) => {
            const done = stageReached(order.status, s.key);
            const isCurrent = order.status === s.key;
            return (
              <li key={s.key} className="flex items-center gap-3">
                {done ? (
                  <CheckCircle2 size={18} className="text-success" />
                ) : isCurrent ? (
                  <Clock size={18} className="text-mustard" />
                ) : (
                  <Circle size={18} className="text-ink-subtle" />
                )}
                <span className={`text-sm ${done ? "text-ink" : "text-ink-subtle"}`}>{s.label}</span>
              </li>
            );
          })}
          {order.status === "FAILED" && (
            <li className="text-sm text-danger">Payment failed — you weren&apos;t charged.</li>
          )}
        </ol>
      </section>

      <section className="card mt-4 p-4 sm:p-6">
        <h2 className="font-display text-lg font-bold">Items</h2>
        <ul className="mt-3 divide-y divide-line">
          {order.items.map((it) => (
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
                <p className="text-xs text-ink-muted">
                  Sold by {it.seller.display_name ?? it.seller.email} · Qty {it.quantity}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatINR(it.price_inr * it.quantity)}</p>
                <p className="text-xs text-ink-subtle">{formatINR(it.price_inr)} each</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-4 p-4 sm:p-6">
        <h2 className="font-display text-lg font-bold">Summary</h2>
        <dl className="mt-3 space-y-1 text-sm">
          <Row k="Subtotal" v={formatINR(order.subtotal_inr)} />
          <Row k="Crafty service fee" v={`included`} />
          <Row k="Total" v={<strong>{formatINR(order.total_inr)}</strong>} />
          {order.invoice_number && <Row k="Invoice" v={order.invoice_number} />}
        </dl>
      </section>

      {(order.shipping_name || order.shipping_address) && (
        <section className="card mt-4 p-4 sm:p-6">
          <h2 className="font-display text-lg font-bold">Ship to</h2>
          <p className="mt-2 whitespace-pre-line text-sm">
            <strong>{order.shipping_name}</strong>{"\n"}
            {order.shipping_address}{"\n"}
            {order.shipping_phone}
          </p>
        </section>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-muted">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
