// POST /api/mock-pay — demo-only payment fulfillment.
//
// Active ONLY when PAYMENTS_MOCK=true (returns 404 otherwise). Performs the
// same state transitions the Razorpay webhook would, so a local preview can
// complete checkout/subscription/feature flows without a real gateway or a
// publicly-reachable webhook. The client calls this after the mock checkout
// overlay (lib/mock-checkout.ts) instead of opening Razorpay.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";
import { isMockMode } from "@/lib/razorpay";
import { fulfillMockOrder, fulfillMockFeatureOrder, fulfillMockSubscription } from "@/lib/payment-fulfill";

export const runtime = "nodejs";

const Schema = z.object({
  kind: z.enum(["order", "feature", "subscription"]),
  id: z.string().min(1).max(40),
});

export async function POST(req: NextRequest) {
  if (!isMockMode()) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  const { kind, id } = parsed.data;

  const result =
    kind === "order" ? await fulfillMockOrder(id, user.id)
    : kind === "feature" ? await fulfillMockFeatureOrder(id, user.id)
    : await fulfillMockSubscription(id, user.id);

  if (!result.ok) return NextResponse.json({ error: result.error ?? "fulfill_failed" }, { status: 404 });
  return NextResponse.json({ ok: true, mock: true, already: result.already ?? false }, { status: 200 });
}
