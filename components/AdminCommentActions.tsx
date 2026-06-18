"use client";

// storefront-completeness — hide/restore a community note from the admin queue.
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminCommentActions({ id, status }: { id: string; status: "VISIBLE" | "HIDDEN" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const hidden = status === "HIDDEN";

  async function run() {
    setBusy(true);
    try {
      await fetch(`/api/community-comments/${id}`, { method: hidden ? "PATCH" : "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={`btn btn-sm btn-secondary${hidden ? "" : " text-danger border-danger"}`}
    >
      {busy ? "…" : hidden ? "Restore" : "Hide"}
    </button>
  );
}
