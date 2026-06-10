// V2.0 — Razorpay webhook receiver.
//
// Events we handle:
//   - payment.captured       → FeatureOrder PAID (and Agent A's Order PAID
//                              once that's wired). Disambiguated by lookup:
//                              we try FeatureOrder first by order_id.
//   - payment.failed         → FeatureOrder FAILED.
//
// V3 additions — Crafty Pro subscriptions (see lib/razorpay.ts):
//   - subscription.activated → Subscription ACTIVE + User.subscription_tier=PRO
//   - subscription.charged   → renewal: bump current_period_* + subscription_expires_at
//   - subscription.cancelled → Subscription CANCELLED (buyer keeps PRO until period end)
//   - subscription.completed → Subscription EXPIRED + User.subscription_tier=FREE
//   - subscription.halted    → payment failure retries exhausted → drop to FREE
//
// Subscription payloads carry payload.subscription.entity (vs
// payload.payment.entity for payment events) — that's the disambiguation key.
//
// Signature: x-razorpay-signature = hex(HMAC-SHA256(rawBody, WEBHOOK_SECRET)).
// Verified against the EXACT raw bytes — not the parsed JSON.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { revalidatePath } from "next/cache";
import { sendOrderConfirmation, sendSellerNewOrder } from "@/lib/email";

export const runtime = "nodejs";

type RzpEvent = {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        notes?: Record<string, string>;
      };
    };
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
        current_start?: number | null;
        current_end?: number | null;
        end_at?: number | null;
        notes?: Record<string, string>;
      };
    };
  };
};

async function flipEntityFeatured(kind: string, id: string, on: boolean): Promise<{ citySlug?: string } | null> {
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

function tsToDate(ts: number | null | undefined): Date | null {
  if (ts == null || !Number.isFinite(ts)) return null;
  // Razorpay timestamps are seconds since epoch.
  return new Date(ts * 1000);
}

async function handleSubscriptionEvent(evt: RzpEvent): Promise<NextResponse> {
  const sub = evt.payload?.subscription?.entity;
  const rzpSubId = sub?.id;
  if (!rzpSubId) {
    return NextResponse.json({ ok: true, skipped: "no_subscription_id" });
  }

  const local = await prisma.subscription.findUnique({
    where: { razorpay_subscription_id: rzpSubId },
  });
  if (!local) {
    return NextResponse.json({ ok: true, skipped: "no_local_subscription" });
  }

  const periodStart = tsToDate(sub?.current_start ?? null);
  const periodEnd = tsToDate(sub?.current_end ?? null);

  try {
    if (evt.event === "subscription.activated") {
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: local.id },
          data: {
            status: "ACTIVE",
            current_period_start: periodStart ?? local.current_period_start,
            current_period_end: periodEnd ?? local.current_period_end,
          },
        }),
        prisma.user.update({
          where: { id: local.user_id },
          data: {
            subscription_tier: "PRO",
            subscription_expires_at: periodEnd ?? null,
          },
        }),
      ]);
    } else if (evt.event === "subscription.charged") {
      // Renewal — refresh the period window and the user's expiry mirror.
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: local.id },
          data: {
            status: "ACTIVE",
            current_period_start: periodStart ?? local.current_period_start,
            current_period_end: periodEnd ?? local.current_period_end,
          },
        }),
        prisma.user.update({
          where: { id: local.user_id },
          data: {
            subscription_tier: "PRO",
            subscription_expires_at: periodEnd ?? null,
          },
        }),
      ]);
    } else if (evt.event === "subscription.cancelled") {
      // Buyer-initiated cancel (or Razorpay-side). Keep PRO until period end —
      // we don't flip the tier yet; subscription.completed handles that.
      await prisma.subscription.update({
        where: { id: local.id },
        data: {
          status: "CANCELLED",
          cancelled_at: local.cancelled_at ?? new Date(),
        },
      });
    } else if (evt.event === "subscription.completed" || evt.event === "subscription.halted") {
      // Final off-ramp: either the cycle ended after cancellation, or
      // Razorpay exhausted retries on a failed renewal.
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: local.id },
          data: { status: evt.event === "subscription.halted" ? "PAST_DUE" : "EXPIRED" },
        }),
        prisma.user.update({
          where: { id: local.user_id },
          data: {
            subscription_tier: "FREE",
            // Keep expires_at as a historical marker; gates already gate by
            // tier AND expiry, and expires_at is in the past at this point.
          },
        }),
      ]);
    }
  } catch (e) {
    console.error("[razorpay-webhook] subscription handler error", evt.event, e);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("x-razorpay-signature");
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let evt: RzpEvent;
  try { evt = JSON.parse(raw) as RzpEvent; }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  // V3 — route subscription.* events to a dedicated handler. These carry
  // payload.subscription.entity instead of payload.payment.entity.
  if (typeof evt.event === "string" && evt.event.startsWith("subscription.")) {
    return handleSubscriptionEvent(evt);
  }

  const payment = evt.payload?.payment?.entity;
  const orderId = payment?.order_id;
  if (!orderId) return NextResponse.json({ ok: true, skipped: "no_order_id" });

  const local = await prisma.featureOrder.findUnique({ where: { razorpay_order_id: orderId } });
  if (local) {
    try {
      if (evt.event === "payment.captured" && local.status !== "PAID") {
        const expires = new Date(Date.now() + local.duration_days * 24 * 60 * 60 * 1000);
        await prisma.featureOrder.update({
          where: { id: local.id },
          data: {
            status: "PAID",
            razorpay_payment_id: payment?.id ?? null,
            paid_at: new Date(),
            feature_expires_at: expires,
          },
        });
        const meta = await flipEntityFeatured(local.entity_type, local.entity_id, true);
        if (meta?.citySlug) revalidatePath(`/${meta.citySlug}`);
      } else if (evt.event === "payment.failed") {
        await prisma.featureOrder.update({
          where: { id: local.id },
          data: { status: "FAILED" },
        });
      }
    } catch (e) {
      console.error("[razorpay-webhook] handler error", e);
      return NextResponse.json({ error: "processing_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // V3 — fall through to checkout Order handling.
  const order = await prisma.order.findUnique({
    where: { razorpay_order_id: orderId },
    include: { items: true, buyer: { select: { email: true, display_name: true } } },
  });
  if (!order) return NextResponse.json({ ok: true, skipped: "no_local_order" });

  try {
    if (evt.event === "payment.captured" && order.status !== "PAID" && order.status !== "FULFILLED") {
      const invoiceNumber = await nextInvoiceNumber();
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            razorpay_payment_id: payment?.id ?? null,
            paid_at: new Date(),
            invoice_number: invoiceNumber,
          },
        });
        // Decrement inventory for ≥0 stock items. -1 (made-to-order) is left alone.
        for (const it of order.items) {
          await tx.product.updateMany({
            where: { id: it.product_id, inventory: { gte: 0 } },
            data: { inventory: { decrement: it.quantity } },
          });
        }
        // Create one Payout row per unique seller, summing their line payouts.
        const bySeller = new Map<string, number>();
        for (const it of order.items) {
          bySeller.set(it.seller_user_id, (bySeller.get(it.seller_user_id) ?? 0) + it.seller_payout_inr);
        }
        for (const [sellerId, amount] of bySeller) {
          await tx.payout.create({
            data: {
              seller_user_id: sellerId,
              amount_inr: amount,
              status: "PENDING",
              notes: `Order ${order.id} · ${invoiceNumber}`,
            },
          });
        }
      });

      // Fire-and-forget emails. Buyer confirmation + per-seller notifications.
      void sendOrderConfirmation({
        to: order.buyer.email,
        firstName: order.buyer.display_name,
        orderId: order.id,
        totalInr: order.total_inr,
        invoiceNumber,
      });
      const sellerLines = new Map<string, { count: number; payout: number }>();
      for (const it of order.items) {
        const cur = sellerLines.get(it.seller_user_id) ?? { count: 0, payout: 0 };
        sellerLines.set(it.seller_user_id, { count: cur.count + 1, payout: cur.payout + it.seller_payout_inr });
      }
      const sellers = await prisma.user.findMany({
        where: { id: { in: Array.from(sellerLines.keys()) } },
        select: { id: true, email: true, display_name: true },
      });
      for (const s of sellers) {
        const ln = sellerLines.get(s.id)!;
        void sendSellerNewOrder({
          to: s.email,
          firstName: s.display_name,
          orderId: order.id,
          itemCount: ln.count,
          payoutInr: ln.payout,
        });
      }

      revalidatePath(`/dashboard/orders/${order.id}`);
      revalidatePath(`/dashboard/sales/${order.id}`);
    } else if (evt.event === "payment.failed") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "FAILED" },
      });
    }
  } catch (e) {
    console.error("[razorpay-webhook] order handler error", e);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// GST-style invoice number: CRA-YYYY-NNNN, sequential by year. We count
// already-issued invoices for the current year and add 1. Concurrent
// captures could in theory collide; the `invoice_number @unique` constraint
// turns that into a transient error the webhook retry will resolve.
async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CRA-${year}-`;
  const existing = await prisma.order.count({
    where: { invoice_number: { startsWith: prefix } },
  });
  const seq = String(existing + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}
