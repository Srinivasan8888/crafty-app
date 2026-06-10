// V3 — cancel a Crafty Pro subscription.
//
// Behaviour: cancel_at_cycle_end = true. The buyer keeps PRO access until
// current_period_end; Razorpay just stops renewal. We update local
// status=CANCELLED + cancelled_at=now() but DO NOT flip
// User.subscription_tier — the webhook does that when subscription.completed
// (or subscription.halted) fires.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { cancelSubscription, isConfigured } from "@/lib/razorpay";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

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

  if (!isConfigured()) {
    return NextResponse.json(
      { error: "razorpay_not_configured" },
      { status: 503 },
    );
  }

  let user;
  try { user = await requireUser(); }
  catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const sub = await prisma.subscription.findUnique({ where: { user_id: user.id } });
  if (!sub) return NextResponse.json({ error: "no_subscription" }, { status: 404 });
  if (sub.status === "CANCELLED") {
    return NextResponse.json({ ok: true, already_cancelled: true });
  }
  if (!sub.razorpay_subscription_id) {
    // Nothing to cancel on Razorpay's side — just mark the local row.
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "CANCELLED", cancelled_at: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  try {
    await cancelSubscription(sub.razorpay_subscription_id, true);
  } catch (e: any) {
    return NextResponse.json({ error: "razorpay_failed", detail: e.message }, { status: 502 });
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "CANCELLED", cancelled_at: new Date() },
  });

  void logAudit({
    actorUserId: user.id,
    action: "subscription.cancel",
    entityType: "USER",
    entityId: user.id,
    metadata: { razorpay_subscription_id: sub.razorpay_subscription_id },
  });

  return NextResponse.json({ ok: true });
}
