"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/cancel", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.error === "razorpay_not_configured") {
          throw new Error("Payments aren't configured. Contact support.");
        }
        throw new Error("Couldn't cancel. Try again.");
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Couldn't cancel.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn btn-ghost btn-sm"
      >
        Cancel subscription
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="text-sm text-ink">Are you sure? You'll keep Pro until the period ends.</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="btn btn-primary btn-sm"
        >
          {busy ? <><Loader2 className="animate-spin" size={12} /> …</> : "Yes, cancel"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="btn btn-ghost btn-sm"
        >
          Keep Pro
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
