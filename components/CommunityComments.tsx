"use client";

// storefront-completeness — community notes: composer + list + report.
// Privacy: the server only ever sends `authorName` (display_name or a neutral
// label), never an email. New notes appear optimistically without a reload.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";

export type CommunityCommentView = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string; // ISO
};

type Labels = {
  title: string;
  empty: string;
  placeholder: string;
  post: string;
  posting: string;
  signIn: string;
  report: string;
  reported: string;
  errorLength: string;
  errorGeneric: string;
};

const MAX = 500;

function whenLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

export function CommunityComments({
  initialComments,
  canPost,
  labels,
}: {
  initialComments: CommunityCommentView[];
  canPost: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const [comments, setComments] = useState<CommunityCommentView[]>(initialComments);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());

  const body = draft.trim();
  const tooLong = draft.length > MAX;

  async function submit() {
    if (!body || tooLong || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/community-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        setError(res.status === 400 ? labels.errorLength : labels.errorGeneric);
        return;
      }
      const created = (await res.json()) as CommunityCommentView;
      setComments((prev) => [created, ...prev]);
      setDraft("");
      router.refresh(); // reconcile with the server-rendered list
    } catch {
      setError(labels.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  async function report(id: string) {
    if (reported.has(id)) return;
    setReported((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/community-comments/${id}/report`, { method: "POST" });
    } catch {
      // Best-effort; the optimistic "reported" state stays either way.
    }
  }

  return (
    <div>
      <div className="sec-title-bar" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22 }}>{labels.title}</h2>
      </div>

      {canPost ? (
        <div className="mb-6">
          <textarea
            className="input"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={labels.placeholder}
            maxLength={MAX + 100}
            aria-label={labels.placeholder}
            style={{ resize: "vertical" }}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className={`text-xs ${tooLong ? "text-danger" : "text-ink-subtle"}`}>
              {draft.length}/{MAX}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submit}
              disabled={!body || tooLong || submitting}
            >
              {submitting ? labels.posting : labels.post}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">{error}</p>
          )}
        </div>
      ) : (
        <p className="mb-6 text-sm text-ink-muted">
          <Link href="/sign-in" className="underline">{labels.signIn}</Link>
        </p>
      )}

      {comments.length === 0 ? (
        <p className="font-display italic text-sm text-muted">{labels.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md border border-line bg-cream-2 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-sm font-semibold text-ink">{c.authorName}</span>
                <span className="text-xs text-ink-subtle">{whenLabel(c.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-muted">{c.body}</p>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => report(c.id)}
                  disabled={reported.has(c.id)}
                  className="inline-flex items-center gap-1 text-xs text-ink-subtle hover:text-danger disabled:opacity-60"
                >
                  <Flag size={11} aria-hidden="true" />
                  {reported.has(c.id) ? labels.reported : labels.report}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
