"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

type Props = {
  endpoint: string;       // e.g. "/api/crafters/abc123"
  kindLabel: string;      // "crafter profile", "store", "studio", "event"
  redirectTo: string;     // where to send the user after delete
  size?: "sm" | "md";
};

export function DeleteListingButton({ endpoint, kindLabel, redirectTo, size = "md" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "delete_failed");
      }
      router.push(redirectTo);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  const sizeCls = size === "sm" ? "btn-sm" : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn btn-ghost ${sizeCls} text-danger`}
        aria-label={`Delete ${kindLabel}`}
      >
        <Trash2 size={size === "sm" ? 12 : 14} /> Delete
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="card max-w-md p-6">
            <h2 id="delete-dialog-title" className="text-lg font-bold text-ink">
              Delete your {kindLabel}?
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              This hides it from the public site immediately. Old links will 404.
              Admin can restore for 30 days; after that it's permanently removed.
            </p>
            {error && (
              <p role="alert" className="mt-3 rounded-md border border-danger bg-danger/10 p-2 text-sm text-danger">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={busy}
                className="btn btn-sm bg-danger text-white"
              >
                {busy ? <><Loader2 className="animate-spin" size={12} /> Deleting…</> : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
