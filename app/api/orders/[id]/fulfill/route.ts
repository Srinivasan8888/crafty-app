// V3 — Seller-side fulfillment.
//
// A seller can mark THEIR items in an order as fulfilled. When every item
// across all sellers is fulfilled, we flip the order to FULFILLED.
// Body: { item_ids: string[] } — the OrderItem ids the seller is marking.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const Schema = z.object({
  // The schema doesn't track per-item fulfillment yet (V3.1); for now we
  // just flip the whole order to FULFILLED once the seller confirms.
  item_ids: z.array(z.string().min(1).max(40)).min(1).max(50),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "orders");
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (order.status !== "PAID" && order.status !== "FULFILLED") {
    return NextResponse.json({ error: "order_not_paid" }, { status: 400 });
  }

  // Verify the caller owns every item they're marking.
  const sellerItems = order.items.filter((i) => parsed.data.item_ids.includes(i.id));
  if (sellerItems.length === 0) return NextResponse.json({ error: "no_matching_items" }, { status: 400 });
  if (sellerItems.some((i) => i.seller_user_id !== user.id) && user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden_not_seller" }, { status: 403 });
  }

  // Flip the whole order to FULFILLED only when this action covers EVERY item
  // in the order (single-seller order, or admin marking all). There is no
  // per-item fulfilled flag yet (V3.1), so a single seller in a MULTI-seller
  // order must NOT flip the entire order — doing so hid the other sellers'
  // fulfill action and showed the buyer "shipped" before they had shipped.
  const coversWholeOrder = order.items.every((i) =>
    parsed.data.item_ids.includes(i.id),
  );

  if (coversWholeOrder) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FULFILLED", fulfilled_at: new Date() },
    });
  }

  void logAudit({
    actorUserId: user.id,
    action: coversWholeOrder ? "order.fulfill" : "order.fulfill.partial",
    entityType: "USER",
    entityId: order.id,
    metadata: { item_ids: parsed.data.item_ids },
  });

  revalidatePath(`/dashboard/sales`);
  revalidatePath(`/dashboard/sales/${order.id}`);
  revalidatePath(`/dashboard/orders/${order.id}`);

  // partial=true means the seller's items were acknowledged but the order has
  // other sellers' items still outstanding, so it stays PAID.
  return NextResponse.json({
    ok: true,
    status: coversWholeOrder ? "FULFILLED" : order.status,
    partial: !coversWholeOrder,
  });
}
