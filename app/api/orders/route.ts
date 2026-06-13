// V3 — Checkout. Creates an Order from the buyer's current cart and a
// matching Razorpay Order, returns checkout params for the client SDK.
//
// Commission: 10% of subtotal goes to platform_fee_inr. Each OrderItem's
// seller_payout_inr is the seller's share of the post-commission total
// (price_inr × qty × 0.9, rounded). Tiny rounding error is absorbed by the
// platform fee so totals always balance.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { phoneNumber } from "@/lib/phone";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { createOrder, publicKeyId, isConfigured, isMockMode } from "@/lib/razorpay";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const COMMISSION_RATE = 0.10;

const Schema = z.object({
  shipping_name: z.string().min(2).max(120),
  shipping_address: z.string().min(8).max(500),
  shipping_phone: phoneNumber,
});

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "orders");
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } });
  }

  if (!isConfigured() && !isMockMode()) {
    return NextResponse.json(
      { error: "razorpay_not_configured", message: "Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env." },
      { status: 503 },
    );
  }

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  }
  const ship = parsed.data;

  const cart = await prisma.cartItem.findMany({
    where: { buyer_user_id: user.id },
    include: {
      product: {
        select: {
          id: true, name: true, price_inr: true, status: true,
          inventory: true, owner_user_id: true,
        },
      },
    },
  });
  if (cart.length === 0) return NextResponse.json({ error: "cart_empty" }, { status: 400 });

  // Final availability check — inventory may have changed since add-to-cart.
  for (const line of cart) {
    if (line.product.status !== "PUBLISHED") {
      return NextResponse.json({ error: "product_unavailable", product_id: line.product.id }, { status: 409 });
    }
    if (line.product.inventory >= 0 && line.quantity > line.product.inventory) {
      return NextResponse.json({ error: "insufficient_inventory", product_id: line.product.id, available: line.product.inventory }, { status: 409 });
    }
  }

  // Compute money. INR is whole rupees in DB.
  const subtotal = cart.reduce((acc, l) => acc + l.product.price_inr * l.quantity, 0);
  const platformFee = Math.round(subtotal * COMMISSION_RATE);
  const total = subtotal; // shipping is V3.1 — buyer pays subtotal only for now.

  // Per-line payouts. Use the same commission rate per-line so the sum
  // matches platform_fee within rounding.
  const itemPayouts = cart.map((l) => {
    const lineGross = l.product.price_inr * l.quantity;
    const linePayout = Math.round(lineGross * (1 - COMMISSION_RATE));
    return { line: l, linePayout };
  });

  // Persist Order + OrderItems + clear cart in one transaction.
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        buyer_user_id: user.id,
        status: "PENDING",
        subtotal_inr: subtotal,
        platform_fee_inr: platformFee,
        total_inr: total,
        shipping_name: ship.shipping_name,
        shipping_address: ship.shipping_address,
        shipping_phone: ship.shipping_phone,
      },
    });
    await tx.orderItem.createMany({
      data: itemPayouts.map(({ line, linePayout }) => ({
        order_id: o.id,
        product_id: line.product.id,
        seller_user_id: line.product.owner_user_id,
        quantity: line.quantity,
        price_inr: line.product.price_inr,
        seller_payout_inr: linePayout,
      })),
    });
    // Clear the cart now that the order is on the books. The Razorpay
    // checkout can still time out, but a stale cart is worse UX than
    // an abandoned PENDING order the buyer can simply retry.
    await tx.cartItem.deleteMany({ where: { buyer_user_id: user.id } });
    return o;
  });

  // Create Razorpay Order using our order id as the receipt — that's how
  // the shared webhook disambiguates Order vs FeatureOrder.
  let rzpOrder;
  try {
    rzpOrder = await createOrder({
      amount_inr: total,
      receipt: order.id,
      notes: { order_id: order.id, kind: "order" },
    });
  } catch (e: any) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "razorpay_failed", detail: e.message }, { status: 502 });
  }
  if (!rzpOrder) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "razorpay_not_configured" }, { status: 503 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { razorpay_order_id: rzpOrder.id },
  });

  void logAudit({
    actorUserId: user.id,
    action: "order.create",
    entityType: "USER",
    entityId: order.id,
    metadata: { subtotal_inr: subtotal, total_inr: total, item_count: cart.length },
  });

  return NextResponse.json({
    order_id: order.id,
    razorpay_order_id: rzpOrder.id,
    razorpay_key_id: publicKeyId(),
    total_inr: total,
  }, { status: 201 });
}
