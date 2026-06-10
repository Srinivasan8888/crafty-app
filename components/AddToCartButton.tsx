"use client";

// V3 — Add a product to the buyer's cart. POSTs to /api/cart and shows a
// toast on success. Optimistically disables itself while pending.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Loader2, Check } from "lucide-react";
import { useToast } from "@/components/Toast";

type Props = {
  productId: string;
  /** Compact mode renders an icon-only button suitable for inside a card. */
  compact?: boolean;
};

export function AddToCartButton({ productId, compact }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function add() {
    setBusy(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg =
          j.error === "cannot_buy_own_product" ? "You can't buy your own product." :
          j.error === "insufficient_inventory" ? "Not enough stock." :
          j.error === "unauthenticated" ? "Sign in to add to cart." :
          "Couldn't add to cart.";
        toast.show(msg, "error");
        return;
      }
      toast.show("Added to cart", "success");
      setDone(true);
      // Refresh server components so cart badges / sidebar counts update.
      router.refresh();
      setTimeout(() => setDone(false), 1800);
    } catch {
      toast.show("Couldn't add to cart.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={add}
        disabled={busy}
        className="btn btn-primary btn-sm"
        aria-label="Add to cart"
      >
        {busy ? (
          <Loader2 className="animate-spin" size={12} aria-hidden="true" />
        ) : done ? (
          <Check size={12} aria-hidden="true" />
        ) : (
          <ShoppingBag size={12} aria-hidden="true" />
        )}
        {done ? "Added" : "Buy"}
      </button>
    );
  }

  return (
    <button type="button" onClick={add} disabled={busy} className="btn btn-primary">
      {busy ? <><Loader2 className="animate-spin" size={14} /> Adding…</> : <><ShoppingBag size={14} /> Add to cart</>}
    </button>
  );
}
