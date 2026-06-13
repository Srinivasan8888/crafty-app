"use client";

// V3 — "Upgrade to Pro" client component. Mirrors FeatureListingButton.
//
// Flow:
//   1. User picks monthly / annual.
//   2. POST /api/subscriptions → razorpay_subscription_id.
//   3. Lazy-load Razorpay Checkout JS and open with `subscription_id`
//      (subscriptions use a different Checkout param than orders).
//   4. On success the webhook flips status=ACTIVE + tier=PRO; client just
//      router.refresh()es so the dashboard reflects the change.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { runMockCheckout } from "@/lib/mock-checkout";

type PlanKey = "monthly" | "annual";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadCheckout(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no_window"));
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("checkout_script_failed"));
    document.head.appendChild(s);
  });
}

const PLAN_OPTIONS: Array<{ id: PlanKey; price: string; sub: string; tag?: string }> = [
  { id: "monthly", price: "₹299", sub: "per month" },
  { id: "annual",  price: "₹2,999", sub: "per year",  tag: "Save 16%" },
];

export function UpgradeButton({ initialPlan = "annual" }: { initialPlan?: PlanKey }) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanKey>(initialPlan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.error === "razorpay_not_configured") {
          throw new Error("Payments aren't configured yet — try again later.");
        }
        if (j.error === "plan_not_configured") {
          throw new Error("This plan isn't live yet. Please contact support.");
        }
        if (j.error === "already_subscribed") {
          throw new Error("You're already on Crafty Pro.");
        }
        throw new Error("Couldn't start checkout.");
      }
      const j = (await res.json()) as {
        subscription_id: string;
        razorpay_subscription_id: string;
        razorpay_key_id: string;
        amount_inr: number;
        plan: PlanKey;
      };
      if (j.razorpay_key_id === "mock") {
        const paid = await runMockCheckout({
          kind: "subscription",
          id: j.subscription_id,
          amountInr: j.amount_inr,
          title: "Crafty Pro",
          description: j.plan === "annual" ? "Annual subscription" : "Monthly subscription",
        });
        if (paid) {
          router.push("/dashboard/subscription");
          router.refresh();
        } else {
          setBusy(false);
        }
        return;
      }
      await loadCheckout();
      const rzp = new window.Razorpay({
        key: j.razorpay_key_id,
        // For subscriptions, pass subscription_id — NOT order_id.
        subscription_id: j.razorpay_subscription_id,
        name: "Crafty Pro",
        description: j.plan === "annual" ? "Annual subscription" : "Monthly subscription",
        handler: () => {
          // Webhook is authoritative. Just refresh — the dashboard re-reads
          // the Subscription row which will be PENDING → ACTIVE shortly after.
          router.push("/dashboard/subscription");
          router.refresh();
        },
        modal: { ondismiss: () => setBusy(false) },
        theme: { color: "#B5365B" },
      });
      rzp.open();
    } catch (e: any) {
      setError(e.message ?? "Couldn't start checkout.");
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-display text-lg font-bold text-ink">Upgrade to Crafty Pro</h2>
      <p className="mt-1 text-sm text-muted">
        Unlock 12 portfolio photos, 25 products, priority placement, and full analytics.
      </p>
      <div className="mt-4 grid gap-2">
        {PLAN_OPTIONS.map((opt) => (
          <label
            key={opt.id}
            className={`flex cursor-pointer items-center justify-between rounded-md border p-3 ${
              plan === opt.id ? "border-accent bg-accent-soft" : "border-line"
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="plan"
                checked={plan === opt.id}
                onChange={() => setPlan(opt.id)}
              />
              <span>
                <span className="block text-sm font-semibold capitalize text-ink">{opt.id}</span>
                <span className="block text-xs text-muted">{opt.sub}</span>
              </span>
            </span>
            <span className="flex items-center gap-2">
              {opt.tag && (
                <span className="rounded-full bg-canvas-sunken px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                  {opt.tag}
                </span>
              )}
              <span className="text-sm font-bold text-ink">{opt.price}</span>
            </span>
          </label>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <button
        type="button"
        onClick={checkout}
        disabled={busy}
        className="btn btn-primary btn-block mt-4 inline-flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <Loader2 className="animate-spin" size={14} /> Loading…
          </>
        ) : (
          <>
            <Sparkles size={14} /> Pay with Razorpay
          </>
        )}
      </button>
      <p className="mt-2 text-xs text-subtle">
        Cancel anytime. You stay on Pro until the end of the current cycle.
      </p>
    </div>
  );
}
