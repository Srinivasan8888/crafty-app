"use client";

// V2.0 — "Message <crafter>" button on entity detail pages. Opens a modal
// with a textarea. On submit, POSTs to /api/messages which creates the
// conversation on demand; redirects to /dashboard/messages/[id].

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Loader2 } from "lucide-react";

type Props = {
  entityType: "CRAFTER" | "STORE" | "STUDIO";
  entityId: string;
  ownerDisplayName?: string | null;
};

export function MessageButton({ entityType, entityId, ownerDisplayName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (body.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, body }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.error === "unauthenticated") {
          window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        if (j.error === "cannot_message_self") throw new Error("That's your own listing.");
        if (j.error === "entity_not_found_or_unclaimed") throw new Error("This listing doesn't accept messages yet.");
        throw new Error("Couldn't send — try again.");
      }
      const j = (await res.json()) as { conversation_id: string };
      router.push(`/dashboard/messages/${j.conversation_id}`);
    } catch (e: any) {
      setError(e.message ?? "Couldn't send.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-ghost btn-sm"
        aria-label="Send a message"
      >
        <MessageCircle size={14} /> Message
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="msg-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="card w-full max-w-md p-5">
            <div className="flex items-center justify-between">
              <h2 id="msg-title" className="text-lg font-bold text-ink">
                Message {ownerDisplayName ?? "the owner"}
              </h2>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} disabled={busy} aria-label="Close">
                <X size={14} />
              </button>
            </div>
            <p className="mt-1 text-xs text-ink-subtle">
              They'll get your message in their Crafty inbox; replies show up in yours at /dashboard/messages.
            </p>
            <textarea
              className="input mt-3 min-h-[100px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi! I love your work. Could I commission a custom piece?"
              maxLength={4000}
              autoFocus
            />
            {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn btn-ghost btn-sm">
                Cancel
              </button>
              <button type="button" onClick={send} disabled={busy || body.trim().length === 0} className="btn btn-primary btn-sm">
                {busy ? <><Loader2 className="animate-spin" size={12} /> Sending…</> : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
