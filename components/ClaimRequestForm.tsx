"use client";

// V3 Tier 4 — Public "Claim this listing" modal trigger + form.
//
// Used on Crafter/Store/Studio detail pages where is_claimed === false. Anyone
// (no auth required) can submit a claim; admin reviews in /admin/claim-requests.

import { useState } from "react";
import { Loader2, X } from "lucide-react";

type Props = {
  entityType: "CRAFTER" | "STORE" | "STUDIO";
  entityId: string;
  entityName: string;
  triggerClassName?: string;
  triggerLabel?: string;
};

export function ClaimRequestForm({
  entityType, entityId, entityName,
  triggerClassName, triggerLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!email.trim() || !message.trim() || message.trim().length < 10) {
      setError("Email and a message (at least 10 chars) are required.");
      return;
    }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/claim-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          claimant_email: email.trim(),
          claimant_phone: phone.trim() || null,
          claimant_name: name.trim() || null,
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "submit_failed");
      }
      setDone(true);
    } catch (e: any) {
      setError(
        e.message === "already_claimed"
          ? "This listing is already claimed."
          : e.message === "rate_limited"
            ? "Too many requests — please try again in a moment."
            : "Couldn't submit. Try again, or email hello@crafty.app.",
      );
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    if (done) {
      setDone(false);
      setEmail(""); setPhone(""); setName(""); setMessage("");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "btn btn-primary btn-sm"}
      >
        {triggerLabel ?? "Is this your business? Claim it →"}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 sm:items-center"
          role="dialog" aria-modal="true" aria-labelledby="claim-modal-title"
        >
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between">
              <h2 id="claim-modal-title" className="font-display text-lg font-bold text-ink">
                Claim {entityName}
              </h2>
              <button className="icon-btn" onClick={close} aria-label="Close" type="button">
                <X size={16} />
              </button>
            </div>

            {done ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-ink">
                  Thanks — we&apos;ve received your claim request and will be in touch within
                  a few days at <strong>{email}</strong>.
                </p>
                <button className="btn btn-primary w-full" type="button" onClick={close}>Close</button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-ink-muted">
                  Tell us how this listing is yours and we&apos;ll review it within a few days.
                </p>
                <div>
                  <label className="label" htmlFor="claim-email">Your email *</label>
                  <input
                    id="claim-email"
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    maxLength={120}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="claim-name">Your name</label>
                  <input
                    id="claim-name"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="claim-phone">Phone (optional)</label>
                  <input
                    id="claim-phone"
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={40}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="claim-msg">How is this yours? *</label>
                  <textarea
                    id="claim-msg"
                    className="input min-h-[120px]"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="License #, photo of storefront, your role, social handles — anything that helps us verify."
                    maxLength={2000}
                  />
                </div>
                {error && <p role="alert" className="text-sm text-danger">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button className="btn" type="button" onClick={close} disabled={busy}>Cancel</button>
                  <button className="btn btn-primary" type="button" onClick={submit} disabled={busy}>
                    {busy ? <><Loader2 className="animate-spin" size={12} /> Submitting…</> : "Submit claim"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
