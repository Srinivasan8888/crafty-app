"use client";

// PRD §7.12 — report-a-listing form. Posts to the existing /api/flags
// (anonymous-friendly, same-origin, entity-existence-validated). Rendered by
// /contact when ref=report, pre-scoped to the resolved listing.

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { FLAG_REASONS, type EntityType, type FlagReason } from "@/lib/types";

const REASON_LABELS: Record<FlagReason, string> = {
  INAPPROPRIATE: "Inappropriate content",
  SPAM: "Spam",
  MISLEADING: "Misleading or inaccurate",
  COPYRIGHT: "Copyright violation",
  OTHER: "Something else",
};

export function ReportForm({
  entityType,
  entityId,
  entityName,
}: {
  entityType: EntityType;
  entityId: string;
  entityName: string;
}) {
  const [reason, setReason] = useState<FlagReason>("INAPPROPRIATE");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          reason,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.error === "rate_limited") throw new Error("You're reporting too quickly — try again in a minute.");
        if (res.status === 404) throw new Error("This listing couldn't be found. It may have been removed.");
        throw new Error("Couldn't submit your report. Please try again.");
      }
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? "Couldn't submit your report.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-5 flex items-start gap-3 rounded-md bg-success/10 p-4 text-sm">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
        <p className="text-ink">
          Thanks — your report about <strong>{entityName}</strong> has been sent to our moderation team. We read every report.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div>
        <label className="label" htmlFor="report-reason">Reason *</label>
        <select
          id="report-reason"
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value as FlagReason)}
        >
          {FLAG_REASONS.map((r) => (
            <option key={r} value={r}>{REASON_LABELS[r]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="report-note">Anything to add? (optional)</label>
        <textarea
          id="report-note"
          className="input min-h-[90px]"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="A short note helps our team review faster."
        />
        <p className="mt-1 text-right text-xs text-ink-subtle">{note.length}/200</p>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? <><Loader2 className="animate-spin" size={14} /> Submitting…</> : "Submit report"}
      </button>
    </form>
  );
}
