"use client";

// V3 — Per-line quantity controls. PATCH /api/cart/[productId] updates
// the absolute quantity; 0 deletes the line.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, Loader2 } from "lucide-react";

type Props = {
  productId: string;
  quantity: number;
  inventory: number; // -1 = made-to-order (unlimited)
};

export function CartLineControls({ productId, quantity, inventory }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(quantity);

  async function setQty(next: number) {
    if (next < 0) return;
    if (inventory >= 0 && next > inventory) return;
    setBusy(true);
    setQ(next);
    try {
      const res = await fetch(`/api/cart/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: next }),
      });
      if (!res.ok) {
        // Roll back; server is authoritative.
        setQ(quantity);
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="icon-btn"
        onClick={() => setQty(q - 1)}
        disabled={busy || q <= 1}
        aria-label="Decrease quantity"
      >
        <Minus size={12} />
      </button>
      <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums">
        {busy ? <Loader2 className="inline animate-spin" size={12} /> : q}
      </span>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setQty(q + 1)}
        disabled={busy || (inventory >= 0 && q >= inventory)}
        aria-label="Increase quantity"
      >
        <Plus size={12} />
      </button>
      <button
        type="button"
        className="icon-btn ml-1 text-danger"
        onClick={() => setQty(0)}
        disabled={busy}
        aria-label="Remove from cart"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
