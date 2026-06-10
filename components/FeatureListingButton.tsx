"use client";

// V2.0 — "Feature this listing" button + tier selector. Opens Razorpay
// Checkout via the externally-hosted checkout.js script (lazy-loaded, no
// bundle weight unless user actually clicks the button).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Loader2 } from "lucide-react";

type Props = {
  entityType: "CRAFTER" | "STORE" | "STUDIO" | "EVENT";
  entityId: string;
  entityName: string;
};

const TIERS = [
  { id: "WEEK",    label: "7 days",  price: "₹500"  },
  { id: "MONTH",   label: "30 days", price: "₹1,500" },
  { id: "QUARTER", label: "90 days", price: "₹3,500" },
] as const;

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

export function FeatureListingButton({ entityType, entityId, entityName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<typeof TIERS[number]["id"]>("MONTH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/featured-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, tier }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.error === "razorpay_not_configured") throw new Error("Payments aren't configured yet — try again later.");
        throw new Error("Couldn't start checkout.");
      }
      const j = (await res.json()) as {
        razorpay_order_id: string;
        razorpay_key_id: string;
        amount_inr: number;
        entity_name: string;
      };
      await loadCheckout();
      const rzp = new window.Razorpay({
        key: j.razorpay_key_id,
        amount: j.amount_inr * 100,
        currency: "INR",
        order_id: j.razorpay_order_id,
        name: "Crafty",
        description: `Feature: ${j.entity_name}`,
        handler: () => {
          // Webhook is authoritative for marking PAID + flipping is_featured.
          // The handler runs client-side as a UX nicety; we just close + refresh.
          setOpen(false);
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
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost btn-sm">
        <Sparkles size={14} /> Feature this listing
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feature-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="card w-full max-w-md p-5">
            <div className="flex items-center justify-between">
              <h2 id="feature-title" className="text-lg font-bold text-ink">
                Feature {entityName}
              </h2>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} disabled={busy} aria-label="Close">
                <X size={14} />
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Pinned at the top of {entityType.toLowerCase()} listings in your city for the chosen duration.
            </p>
            <div className="mt-4 grid gap-2">
              {TIERS.map((t) => (
                <label
                  key={t.id}
                  className={`flex cursor-pointer items-center justify-between rounded-md border p-3 ${
                    tier === t.id ? "border-accent bg-accent-soft" : "border-line"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="tier"
                      checked={tier === t.id}
                      onChange={() => setTier(t.id)}
                    />
                    <span className="text-sm font-semibold text-ink">{t.label}</span>
                  </span>
                  <span className="text-sm font-semibold text-ink">{t.price}</span>
                </label>
              ))}
            </div>
            {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn btn-ghost btn-sm">
                Cancel
              </button>
              <button type="button" onClick={checkout} disabled={busy} className="btn btn-primary btn-sm">
                {busy ? <><Loader2 className="animate-spin" size={12} /> Loading…</> : "Pay with Razorpay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
