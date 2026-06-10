"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";

export function UnsubscribeButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      await fetch(`/api/saved-searches?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="btn btn-ghost btn-sm"
      aria-label="Unsubscribe from this saved search"
    >
      {busy ? <Loader2 className="animate-spin" size={12} /> : <X size={12} />} Unsubscribe
    </button>
  );
}
