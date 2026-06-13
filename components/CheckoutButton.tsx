"use client";

// V3 — Cart checkout. Collects shipping fields inline, then opens Razorpay
// Checkout JS with the order returned by POST /api/orders. Mirrors the
// lazy-load pattern from FeatureListingButton.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingBag } from "lucide-react";
import { formatINR } from "@/lib/util";
import { runMockCheckout } from "@/lib/mock-checkout";

type Props = {
  totalInr: number;
};

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

export function CheckoutButton({ totalInr }: Props) {
  const router = useRouter();
  const [showShipping, setShowShipping] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length >= 2 && address.trim().length >= 8 && phone.trim().length >= 7;

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping_name: name.trim(),
          shipping_address: address.trim(),
          shipping_phone: phone.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.error === "razorpay_not_configured") throw new Error("Payments aren't configured yet.");
        if (j.error === "cart_empty") throw new Error("Your cart is empty.");
        if (j.error === "product_unavailable") {
          router.refresh();
          throw new Error("One of your items is no longer available — review your cart.");
        }
        if (j.error === "insufficient_inventory") {
          router.refresh();
          throw new Error("One of your items just sold out — review your cart.");
        }
        throw new Error("Couldn't start checkout.");
      }
      const j = (await res.json()) as {
        order_id: string;
        razorpay_order_id: string;
        razorpay_key_id: string;
        total_inr: number;
      };
      if (j.razorpay_key_id === "mock") {
        const paid = await runMockCheckout({
          kind: "order",
          id: j.order_id,
          amountInr: j.total_inr,
          title: "Crafty order",
          description: `Order ${j.order_id}`,
        });
        if (paid) router.push(`/dashboard/orders/${j.order_id}?welcome=1`);
        else setBusy(false);
        return;
      }
      await loadCheckout();
      const rzp = new window.Razorpay({
        key: j.razorpay_key_id,
        amount: j.total_inr * 100,
        currency: "INR",
        order_id: j.razorpay_order_id,
        name: "Crafty",
        description: `Order ${j.order_id}`,
        prefill: { name, contact: phone },
        handler: () => {
          // Webhook is authoritative for marking PAID + invoicing; the
          // confetti page polls or shows pending until that lands.
          router.push(`/dashboard/orders/${j.order_id}?welcome=1`);
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

  if (!showShipping) {
    return (
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={() => setShowShipping(true)}
      >
        <ShoppingBag size={14} /> Checkout · {formatINR(totalInr)}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display text-base font-bold">Shipping details</h3>
      <div>
        <label className="label" htmlFor="ship-name">Full name *</label>
        <input id="ship-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aisha Mehta" />
      </div>
      <div>
        <label className="label" htmlFor="ship-addr">Address *</label>
        <textarea id="ship-addr" className="input min-h-[80px]" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House / flat, street, neighborhood, city, PIN" />
      </div>
      <div>
        <label className="label" htmlFor="ship-phone">Phone *</label>
        <input id="ship-phone" type="tel" inputMode="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91-98765-43210" />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowShipping(false)} disabled={busy}>
          Back
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={pay} disabled={!valid || busy}>
          {busy ? <><Loader2 className="animate-spin" size={12} /> Loading…</> : `Pay ${formatINR(totalInr)}`}
        </button>
      </div>
    </div>
  );
}
