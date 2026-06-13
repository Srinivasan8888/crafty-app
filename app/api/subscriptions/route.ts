// V3 — Crafty Pro subscription create + read.
//
// POST flow (mirrors /api/featured-orders, but uses Razorpay Subscriptions
// instead of Orders):
//   1. Same-origin + rate-limit + requireUser.
//   2. Reject if the user already has an ACTIVE subscription (409).
//   3. Upsert a local Subscription row (status=PENDING) keyed on user_id.
//   4. Create a Razorpay Subscription using the configured plan_id.
//   5. Stash the razorpay_subscription_id on the local row.
//   6. Return checkout-friendly payload — the client passes
//      razorpay_subscription_id to Checkout as `subscription_id`.
//
// The webhook (app/api/webhooks/razorpay/route.ts) is authoritative for
// flipping status=ACTIVE and User.subscription_tier=PRO.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { createSubscription, publicKeyId, isConfigured, isMockMode } from "@/lib/razorpay";
import { getPlanConfig, getRazorpayPlanId } from "@/lib/subscription-plans";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const Schema = z.object({
  plan: z.enum(["monthly", "annual"]),
});

// total_count = how many billing cycles before Razorpay auto-completes the
// subscription. We pick a generous upper bound so renewals run for years
// without manual intervention. Cancellation is the supported off-ramp.
const TOTAL_COUNT_MONTHLY = 120; // 10 years of monthly renewals
const TOTAL_COUNT_ANNUAL = 10;   // 10 years of annual renewals

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const rl = await rateLimit(req, "crafters");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } },
    );
  }

  if (!isConfigured() && !isMockMode()) {
    return NextResponse.json(
      { error: "razorpay_not_configured", message: "Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env." },
      { status: 503 },
    );
  }

  let user;
  try { user = await requireUser(); }
  catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  }
  const { plan } = parsed.data;

  // Reject if there's already an ACTIVE subscription on this user.
  const existing = await prisma.subscription.findUnique({ where: { user_id: user.id } });
  if (existing && existing.status === "ACTIVE") {
    return NextResponse.json({ error: "already_subscribed" }, { status: 409 });
  }

  const planConfig = getPlanConfig(plan);
  // In mock mode there is no real Razorpay plan; use a synthetic id so the
  // flow proceeds (createSubscription ignores it under mock).
  const planId = getRazorpayPlanId(plan) ?? (isMockMode() ? "plan_mock" : null);
  if (!planId) {
    return NextResponse.json(
      { error: "plan_not_configured", message: `Set ${planConfig.plan_id_env_var} in .env (Razorpay dashboard → Subscriptions → Plans).` },
      { status: 503 },
    );
  }

  // 1. Upsert local Subscription row (unique by user_id). Keep status PENDING
  //    until the webhook activates it.
  const local = await prisma.subscription.upsert({
    where: { user_id: user.id },
    create: {
      user_id: user.id,
      plan,
      amount_inr: planConfig.amount_inr,
      status: "PENDING",
    },
    update: {
      plan,
      amount_inr: planConfig.amount_inr,
      status: "PENDING",
      razorpay_subscription_id: null,
      cancelled_at: null,
    },
  });

  // 2. Create Razorpay Subscription.
  let rzpSub;
  try {
    rzpSub = await createSubscription({
      plan_id: planId,
      customer_notify: 1,
      total_count: plan === "monthly" ? TOTAL_COUNT_MONTHLY : TOTAL_COUNT_ANNUAL,
      notes: {
        subscription_id: local.id,
        user_id: user.id,
        plan,
      },
    });
  } catch (e: any) {
    await prisma.subscription.update({ where: { id: local.id }, data: { status: "FAILED" } }).catch(() => {});
    return NextResponse.json({ error: "razorpay_failed", detail: e.message }, { status: 502 });
  }
  if (!rzpSub) {
    return NextResponse.json({ error: "razorpay_not_configured" }, { status: 503 });
  }

  // 3. Persist the Razorpay-side subscription id.
  await prisma.subscription.update({
    where: { id: local.id },
    data: { razorpay_subscription_id: rzpSub.id },
  });

  void logAudit({
    actorUserId: user.id,
    action: "subscription.create",
    entityType: "USER",
    entityId: user.id,
    metadata: { plan, razorpay_subscription_id: rzpSub.id, amount_inr: planConfig.amount_inr },
  });

  return NextResponse.json(
    {
      subscription_id: local.id,
      razorpay_subscription_id: rzpSub.id,
      razorpay_key_id: publicKeyId(),
      amount_inr: planConfig.amount_inr,
      plan,
    },
    { status: 201 },
  );
}

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const sub = await prisma.subscription.findUnique({ where: { user_id: user.id } });
  return NextResponse.json({ subscription: sub ?? null });
}
