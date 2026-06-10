"use client";

// V3 Tier 2 — Owner inline "Respond" form on a review they own.
// Posts to /api/reviews/[id]/response. On success, calls router.refresh()
// so the nested response card appears.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

export function CreatorResponseForm({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!body.trim()) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "post_failed");
      }
      setBody("");
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Couldn't post — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-forest" htmlFor={`resp-${reviewId}`}>
        Respond as the owner
      </label>
      <textarea
        id={`resp-${reviewId}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={1500}
        placeholder="Thank the reviewer, address feedback, or share an update…"
        className="input mt-1 text-sm"
      />
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
      <div className="mt-2 flex items-center justify-end gap-2">
        <span className="text-xs text-ink-subtle">{body.length}/1500</span>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !body.trim()}
          className="btn btn-primary btn-sm"
        >
          {busy ? <><Loader2 className="animate-spin" size={12} /> Posting…</> : <><Send size={12} /> Post reply</>}
        </button>
      </div>
    </div>
  );
}
