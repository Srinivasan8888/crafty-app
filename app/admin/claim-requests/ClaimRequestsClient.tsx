"use client";

// V3 Tier 4 — admin queue interactive shell. Each row exposes Approve / Reject
// / Withdraw actions and an admin_note input.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";

type Row = {
  id: string;
  entity_type: string;
  entity_id: string;
  entityName: string;
  entityUrl: string | null;
  isStillClaimable: boolean;
  claimant_email: string;
  claimant_phone: string | null;
  claimant_name: string | null;
  message: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

export function ClaimRequestsClient({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-ink-muted">
        No claim requests yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => <ClaimCard key={r.id} row={r} />)}
    </div>
  );
}

function ClaimCard({ row }: { row: Row }) {
  const router = useRouter();
  const [adminNote, setAdminNote] = useState(row.admin_note ?? "");
  const [approveEmail, setApproveEmail] = useState(row.claimant_email);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "reject" | "withdraw") {
    setBusy(action); setError(null);
    try {
      const payload: Record<string, unknown> = { action, admin_note: adminNote || undefined };
      if (action === "approve") {
        payload.approved_user_email = approveEmail.trim();
      }
      const res = await fetch(`/api/admin/claim-requests/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "action_failed");
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Failed.");
    } finally {
      setBusy(null);
    }
  }

  const statusColor =
    row.status === "PENDING" ? "text-magenta"
    : row.status === "APPROVED" ? "text-success"
    : row.status === "REJECTED" ? "text-danger"
    : "text-ink-subtle";

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${statusColor}`}>
          {row.status}
        </span>
        <p className="font-semibold text-ink">
          {row.entityUrl ? (
            <a href={row.entityUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
              {row.entityName}
            </a>
          ) : (
            row.entityName
          )}
        </p>
        <span className="text-xs text-ink-subtle">({row.entity_type})</span>
        <p className="ml-auto text-xs text-ink-subtle">
          Requested {new Date(row.created_at).toLocaleDateString()}
        </p>
      </div>
      <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="text-sm text-ink">
            <strong>{row.claimant_name ?? "—"}</strong> &lt;{row.claimant_email}&gt;
            {row.claimant_phone ? ` · ${row.claimant_phone}` : ""}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">{row.message}</p>
        </div>
      </div>

      {!row.isStillClaimable && row.status === "PENDING" && (
        <p className="mt-2 rounded-md bg-canvas-sunken px-3 py-2 text-xs text-ink-muted">
          Heads up: this listing has been claimed by someone else since this request was submitted.
        </p>
      )}

      {row.status === "PENDING" ? (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <label className="label text-xs" htmlFor={`note-${row.id}`}>Admin note (internal)</label>
          <textarea
            id={`note-${row.id}`}
            className="input text-sm"
            rows={2}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            maxLength={1000}
          />
          <label className="label text-xs" htmlFor={`email-${row.id}`}>Approve as user (email)</label>
          <input
            id={`email-${row.id}`}
            className="input text-sm"
            value={approveEmail}
            onChange={(e) => setApproveEmail(e.target.value)}
            maxLength={120}
          />
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => act("approve")}
              disabled={!!busy}
            >
              {busy === "approve" ? <><Loader2 className="animate-spin" size={12} /> Approving…</> : <><Check size={12} /> Approve</>}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => act("reject")}
              disabled={!!busy}
            >
              {busy === "reject" ? <><Loader2 className="animate-spin" size={12} /> Rejecting…</> : <><X size={12} /> Reject</>}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => act("withdraw")}
              disabled={!!busy}
            >
              {busy === "withdraw" ? "Marking…" : "Mark withdrawn"}
            </button>
          </div>
        </div>
      ) : (
        row.admin_note && (
          <p className="mt-3 border-t border-line pt-2 text-xs text-ink-subtle">
            <strong>Admin note:</strong> {row.admin_note}
          </p>
        )
      )}
    </div>
  );
}
