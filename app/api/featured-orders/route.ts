// V2.0 — create a Razorpay Order for featuring a listing.
//
// Flow:
//   1. Owner clicks "Feature this listing" → POST here with entity + tier.
//   2. We create a local FeatureOrder (status=PENDING) + a Razorpay Order.
//   3. Response includes razorpay_order_id + public key — client opens
//      Razorpay Checkout with those.
//   4. After payment, Razorpay fires our webhook which marks PAID + sets
//      feature_expires_at + flips entity.is_featured=true.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCreator } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { createOrder, publicKeyId, isConfigured } from "@/lib/razorpay";

export const runtime = "nodejs";

// Three pre-defined tiers. Price + duration baked in server-side so the
// client can't pass a 0-rupee 30-day order.
const TIERS = {
  WEEK:     { amount_inr: 500,  duration_days: 7  },
  MONTH:    { amount_inr: 1500, duration_days: 30 },
  QUARTER:  { amount_inr: 3500, duration_days: 90 },
} as const;
type Tier = keyof typeof TIERS;

const Schema = z.object({
  entity_type: z.enum(["CRAFTER", "STORE", "STUDIO", "EVENT"]),
  entity_id: z.string().min(1).max(40),
  tier: z.enum(["WEEK", "MONTH", "QUARTER"]),
});
type FeaturedOrderInput = z.infer<typeof Schema>;

async function loadOwnedEntity(kind: FeaturedOrderInput["entity_type"], id: string, userId: string) {
  if (kind === "CRAFTER") {
    const r = await prisma.crafter.findUnique({ where: { id }, select: { owner_user_id: true, name: true } });
    return r?.owner_user_id === userId ? r : null;
  }
  if (kind === "STORE") {
    const r = await prisma.store.findUnique({ where: { id }, select: { owner_user_id: true, name: true } });
    return r?.owner_user_id === userId ? r : null;
  }
  if (kind === "STUDIO") {
    const r = await prisma.studio.findUnique({ where: { id }, select: { owner_user_id: true, name: true } });
    return r?.owner_user_id === userId ? r : null;
  }
  const r = await prisma.event.findUnique({ where: { id }, select: { organizer_user_id: true, name: true } });
  return r?.organizer_user_id === userId ? { owner_user_id: r.organizer_user_id, name: r.name } : null;
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "crafters");
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  if (!isConfigured()) {
    return NextResponse.json(
      { error: "razorpay_not_configured", message: "Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env." },
      { status: 503 },
    );
  }

  let user;
  try { user = await requireCreator(); }
  catch (e: any) {
    if (e?.message === "FORBIDDEN_NOT_CREATOR") return NextResponse.json({ error: "not_a_creator" }, { status: 403 });
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const entity = await loadOwnedEntity(data.entity_type, data.entity_id, user.id);
  if (!entity) return NextResponse.json({ error: "forbidden_not_owner" }, { status: 403 });

  const tier = TIERS[data.tier as Tier];

  // 1. Local pending row first — gives us a stable receipt to pass to Razorpay.
  const local = await prisma.featureOrder.create({
    data: {
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      buyer_user_id: user.id,
      amount_inr: tier.amount_inr,
      duration_days: tier.duration_days,
      status: "PENDING",
    },
  });

  // 2. Create Razorpay Order using the local id as receipt.
  let order;
  try {
    order = await createOrder({
      amount_inr: tier.amount_inr,
      receipt: local.id,
      notes: {
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        feature_order_id: local.id,
      },
    });
  } catch (e: any) {
    await prisma.featureOrder.update({ where: { id: local.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "razorpay_failed", detail: e.message }, { status: 502 });
  }
  if (!order) {
    return NextResponse.json({ error: "razorpay_not_configured" }, { status: 503 });
  }

  await prisma.featureOrder.update({
    where: { id: local.id },
    data: { razorpay_order_id: order.id },
  });

  return NextResponse.json({
    feature_order_id: local.id,
    razorpay_order_id: order.id,
    razorpay_key_id: publicKeyId(),
    amount_inr: tier.amount_inr,
    duration_days: tier.duration_days,
    entity_name: entity.name,
  }, { status: 201 });
}
