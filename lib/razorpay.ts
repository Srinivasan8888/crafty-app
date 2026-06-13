// V2.0 — Razorpay wrapper. Two operations: create an Order on the server,
// and verify a payment-success webhook signature.
//
// Like other third-party libs in this codebase, this no-ops cleanly when
// keys are placeholder. `isConfigured()` lets API routes 503 themselves
// before charging anything.
//
// Razorpay's flow:
//   1. Server: POST https://api.razorpay.com/v1/orders → returns order_id.
//   2. Client: open Razorpay Checkout with that order_id. User pays.
//   3. Razorpay calls our webhook on success — we verify HMAC-SHA256 over the
//      raw body using RAZORPAY_WEBHOOK_SECRET, then mark the FeatureOrder PAID.

import crypto from "node:crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

// ─── Mock mode (demo / preview) ────────────────────────────────────────
// When PAYMENTS_MOCK=true, every Razorpay call is short-circuited with a
// synthetic object and `publicKeyId()` returns the "mock" sentinel. The
// client detects that sentinel and skips the real Checkout SDK; the
// /api/mock-pay endpoint performs the state transitions the webhook would.
// Takes precedence over real keys so a local preview always completes
// (Razorpay's webhook can't reach localhost). Default OFF — prod is untouched.
export const MOCK_KEY_SENTINEL = "mock";

export function isMockMode(): boolean {
  return process.env.PAYMENTS_MOCK === "true";
}

export function isConfigured(): boolean {
  return (
    !!KEY_ID && !!KEY_SECRET &&
    !KEY_ID.startsWith("rzp_placeholder") &&
    !KEY_SECRET.startsWith("placeholder")
  );
}

export function publicKeyId(): string | null {
  if (isMockMode()) return MOCK_KEY_SENTINEL;
  // Safe to expose — Razorpay's public key (used by the Checkout SDK).
  return isConfigured() ? KEY_ID! : null;
}

export type CreateOrderArgs = {
  amount_inr: number;       // whole rupees
  receipt: string;          // our internal reference (FeatureOrder.id)
  notes?: Record<string, string>;
};

export type RazorpayOrder = {
  id: string;
  amount: number;           // paise
  currency: "INR";
  receipt: string;
  status: string;
};

export async function createOrder(args: CreateOrderArgs): Promise<RazorpayOrder | null> {
  if (isMockMode()) {
    return {
      id: `order_mock_${args.receipt}`,
      amount: args.amount_inr * 100,
      currency: "INR",
      receipt: args.receipt,
      status: "created",
    };
  }
  if (!isConfigured()) return null;
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64"),
    },
    body: JSON.stringify({
      amount: args.amount_inr * 100, // Razorpay wants paise
      currency: "INR",
      receipt: args.receipt,
      notes: args.notes ?? {},
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`razorpay_order_failed: ${res.status} ${txt.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Verify a webhook payload signature. Razorpay sends:
 *   x-razorpay-signature: hex(HMAC-SHA256(rawBody, WEBHOOK_SECRET))
 * Must be called against the EXACT raw bytes received, not the parsed JSON.
 */
export function verifyWebhookSignature(rawBody: string, sig: string | null): boolean {
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET === "placeholder") return false;
  if (!sig) return false;
  const computed = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(computed));
  } catch {
    return false;
  }
}

// ─── V3 — Razorpay Subscriptions API ───────────────────────────────────
//
// Razorpay Subscriptions are a separate primitive from Orders:
//   - You pre-create a Plan in the Razorpay dashboard (Subscriptions → Plans)
//     and reference its plan_id from each subscription create call.
//   - Create a Subscription on the server, hand the returned `id` to the
//     Checkout SDK as `subscription_id` (NOT `order_id`).
//   - Razorpay drives lifecycle via webhooks: subscription.activated,
//     subscription.charged (renewals), subscription.cancelled,
//     subscription.completed, subscription.halted.

type RazorpaySubscriptionCreateArgs = {
  plan_id: string;
  customer_notify?: 0 | 1;
  total_count: number;          // billing cycles before auto-end; 12 for monthly-year, 5 for annual-5-yr, etc.
  notes?: Record<string, string>;
};

export type RazorpaySubscription = {
  id: string;
  entity: "subscription";
  plan_id: string;
  status: string;               // created | authenticated | active | pending | halted | cancelled | completed | expired
  current_start: number | null;
  current_end: number | null;
  charge_at: number | null;
  start_at: number | null;
  end_at: number | null;
  total_count: number;
  paid_count: number;
  short_url: string | null;
  notes?: Record<string, string>;
};

async function razorpayFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`https://api.razorpay.com${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64"),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`razorpay_${path.replaceAll("/", "_")}_failed: ${res.status} ${txt.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Create a Razorpay Subscription. Returns null when keys are placeholder so
 * API routes can 503 cleanly. The frontend passes the returned `id` to
 * Razorpay Checkout as `subscription_id`.
 */
export async function createSubscription(
  args: RazorpaySubscriptionCreateArgs,
): Promise<RazorpaySubscription | null> {
  if (isMockMode()) {
    const localId = args.notes?.subscription_id ?? "local";
    return {
      id: `sub_mock_${localId}`,
      entity: "subscription",
      plan_id: args.plan_id,
      status: "created",
      current_start: null,
      current_end: null,
      charge_at: null,
      start_at: null,
      end_at: null,
      total_count: args.total_count,
      paid_count: 0,
      short_url: null,
      notes: args.notes,
    };
  }
  if (!isConfigured()) return null;
  return razorpayFetch<RazorpaySubscription>("/v1/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: args.plan_id,
      customer_notify: args.customer_notify ?? 1,
      total_count: args.total_count,
      notes: args.notes ?? {},
    }),
  });
}

/**
 * Cancel a Razorpay Subscription. Pass cancel_at_cycle_end=true to keep the
 * buyer entitled until current_period_end (the V3 default — we don't
 * pro-rate refunds).
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancel_at_cycle_end: boolean,
): Promise<RazorpaySubscription | null> {
  if (isMockMode()) {
    return {
      id: subscriptionId,
      entity: "subscription",
      plan_id: "",
      status: "cancelled",
      current_start: null,
      current_end: null,
      charge_at: null,
      start_at: null,
      end_at: null,
      total_count: 0,
      paid_count: 0,
      short_url: null,
    };
  }
  if (!isConfigured()) return null;
  return razorpayFetch<RazorpaySubscription>(`/v1/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({
      cancel_at_cycle_end: cancel_at_cycle_end ? 1 : 0,
    }),
  });
}

/**
 * Fetch the current Razorpay-side state of a subscription. Used for
 * reconciliation (a future cron will use this to detect missed webhooks).
 */
export async function fetchSubscription(
  subscriptionId: string,
): Promise<RazorpaySubscription | null> {
  if (!isConfigured()) return null;
  return razorpayFetch<RazorpaySubscription>(`/v1/subscriptions/${subscriptionId}`, {
    method: "GET",
  });
}
