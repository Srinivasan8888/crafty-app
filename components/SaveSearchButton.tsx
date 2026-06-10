"use client";

// "Get notified" button on /[city]/search results. Subscribes the current
// query + entity_type as a SavedSearch; daily cron emails the user when new
// matches show up.

import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";

type Props = {
  cityId: string;
  query: string;
  entityType: "CRAFTER" | "STORE" | "STUDIO" | "EVENT";
};

export function SaveSearchButton({ cityId, query, entityType }: Props) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setState("saving");
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city_id: cityId, query, entity_type: entityType }),
      });
      if (!res.ok) throw new Error("save_failed");
      setState("saved");
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <Check size={12} aria-hidden /> We'll email you when new matches appear.
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={save}
      disabled={state === "saving"}
      className="btn btn-ghost btn-sm"
      aria-label={`Subscribe to ${entityType.toLowerCase()} search for "${query}"`}
    >
      {state === "saving"
        ? <><Loader2 className="animate-spin" size={12} /> Saving…</>
        : <><Bell size={12} /> {state === "error" ? "Try again" : "Notify me of new matches"}</>}
    </button>
  );
}
