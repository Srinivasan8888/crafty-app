"use client";

// V3 Tier 4 — admin AI triage button for the flag queue.
// Posts to /api/admin/flags/[id]/triage and renders the verdict inline.

import { useState } from "react";

type Verdict = "DISMISS" | "HIDE" | "DELETE" | "UNCLEAR";
type TriageResult = {
  verdict: Verdict;
  confidence: number;
  reasoning: string;
  model: string;
};

const VERDICT_STYLES: Record<Verdict, string> = {
  DISMISS: "bg-emerald-50 text-emerald-900 border-emerald-200",
  HIDE: "bg-amber-50 text-amber-900 border-amber-200",
  DELETE: "bg-rose-50 text-rose-900 border-rose-200",
  UNCLEAR: "bg-canvas-sunken text-ink-muted border-line",
};

export function AiTriageButton({ flagId }: { flagId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/flags/${flagId}/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        setError(`Request failed (${res.status})`);
        return;
      }
      const json = (await res.json()) as TriageResult;
      setResult(json);
    } catch (e) {
      setError((e as Error).message ?? "request error");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div
        className={`rounded-md border px-2.5 py-2 text-xs ${VERDICT_STYLES[result.verdict]}`}
      >
        <div className="flex items-center gap-2">
          <strong className="font-semibold">{result.verdict}</strong>
          <span className="opacity-70">
            ({Math.round(result.confidence * 100)}% conf · {result.model})
          </span>
        </div>
        <p className="mt-1 leading-snug">{result.reasoning}</p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium hover:bg-canvas-sunken disabled:opacity-50"
      >
        {loading ? "Triaging…" : "AI triage"}
      </button>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
