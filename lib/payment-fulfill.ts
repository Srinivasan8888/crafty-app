// Mock-mode payment fulfillment.
//
// Replicates the state transitions the Razorpay webhook performs
// (app/api/webhooks/razorpay/route.ts) so a local preview can complete a
// "payment" without a real gateway or a reachable webhook. Used ONLY by
// POST /api/mock-pay, which is gated on PAYMENTS_MOCK=true.
//
// Kept deliberately separate from the webhook so the real payment path is
// untouched. Transactional emails are intentionally skipped here — demo mode
// should not send real mail to seeded addresses.

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

type FulfillResult = { ok: boolean; already?: boolean; error?: string };

async function flipEntityFeatured(
  kind: string,
  id: string,
  on: boolean,
): Promise<{ citySlug?: string } | null> {
  if (kind === "CRAFTER") {
    const r = await prisma.crafter.update({ where: { id }, data: { is_featured: on }, select: { city: { select: { slug: true } } } });
    return { citySlug: r.city.slug };
  }
  if (kind === "STORE") {
    const r = await prisma.store.update({ where: { id }, data: { is_featured: on }, select: { city: { select: { slug: true } } } });
    return { citySlug: r.city.slug };
  }
  if (kind === "STUDIO") {
    const r = await prisma.studio.update({ where: { id }, data: { is_featured: on }, select: { city: { select: { slug: true } } } });
    return { citySlug: r.city.slug };
  }
  if (kind === "EVENT") {
    const r = await prisma.event.update({ where: { id }, data: { is_featured: on }, select: { city: { select: { slug: true } } } });
    return { citySlug: r.city.slug };
  }
  return null;
}

// Mirrors nextInvoiceNumber() in the webhook (CRA-YYYY-NNNN).
async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CRA-${year}-`;
  const existing = await prisma.order.count({ where: { invoice_number: { startsWith: prefix } } });
  return `${prefix}${String(existing + 1).padStart(4, "0")}`;
}

/** Feature-listing order → PAID + is_featured=true. */
export async function fulfillMockFeatureOrder(featureOrderId: string, userId: string): Promise<FulfillResult> {
  const fo = await prisma.featureOrder.findUnique({ where: { id: featureOrderId } });
  if (!fo || fo.buyer_user_id !== userId) return { ok: false, error: "not_found" };
  if (fo.status === "PAID") return { ok: true, already: true };

  const expires = new Date(Date.now() + fo.duration_days * 24 * 60 * 60 * 1000);
  await prisma.featureOrder.update({
    where: { id: fo.id },
    data: { status: "PAID", razorpay_payment_id: `pay_mock_${fo.id}`, paid_at: new Date(), feature_expires_at: expires },
  });
  const meta = await flipEntityFeatured(fo.entity_type, fo.entity_id, true);
  if (meta?.citySlug) revalidatePath(`/${meta.citySlug}`);
  return { ok: true };
}

/** Cart order → PAID + invoice + inventory decrement + seller payouts. */
export async function fulfillMockOrder(orderId: string, userId: string): Promise<FulfillResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.buyer_user_id !== userId) return { ok: false, error: "not_found" };
  if (order.status === "PAID" || order.status === "FULFILLED") return { ok: true, already: true };

  const invoiceNumber = await nextInvoiceNumber();
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", razorpay_payment_id: `pay_mock_${order.id}`, paid_at: new Date(), invoice_number: invoiceNumber },
    });
    for (const it of order.items) {
      await tx.product.updateMany({ where: { id: it.product_id, inventory: { gte: 0 } }, data: { inventory: { decrement: it.quantity } } });
    }
    const bySeller = new Map<string, number>();
    for (const it of order.items) {
      bySeller.set(it.seller_user_id, (bySeller.get(it.seller_user_id) ?? 0) + it.seller_payout_inr);
    }
    for (const [sellerId, amount] of bySeller) {
      await tx.payout.create({ data: { seller_user_id: sellerId, amount_inr: amount, status: "PENDING", notes: `Order ${order.id} · ${invoiceNumber} (mock)` } });
    }
  });
  revalidatePath(`/dashboard/orders/${order.id}`);
  revalidatePath(`/dashboard/sales/${order.id}`);
  return { ok: true };
}

/** Crafty Pro subscription → ACTIVE + User.subscription_tier=PRO. */
export async function fulfillMockSubscription(subscriptionId: string, userId: string): Promise<FulfillResult> {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub || sub.user_id !== userId) return { ok: false, error: "not_found" };
  if (sub.status === "ACTIVE") return { ok: true, already: true };

  const start = new Date();
  const end = new Date(start);
  if (sub.plan === "annual") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "ACTIVE", current_period_start: start, current_period_end: end },
    }),
    prisma.user.update({
      where: { id: sub.user_id },
      data: { subscription_tier: "PRO", subscription_expires_at: end },
    }),
  ]);
  revalidatePath("/dashboard/subscription");
  return { ok: true };
}
