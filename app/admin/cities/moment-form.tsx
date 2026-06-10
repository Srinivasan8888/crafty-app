"use client";

// V1.5 — per-city CommunityMoment editor. Lives inside /admin/cities.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function CommunityMomentForm({
  cityId,
  initialPhotoUrl,
  initialCaption,
}: {
  cityId: string;
  initialPhotoUrl: string;
  initialCaption: string;
}) {
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [caption, setCaption] = useState(initialCaption);
  const [busy, setBusy] = useState(false);

  async function save(clear: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/cities/${cityId}/community-moment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clear ? { clear: true } : { photoUrl, caption }),
      });
      if (!res.ok) throw new Error("save_failed");
      router.refresh();
    } catch {
      // surface errors inline once we have a toast system
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="card my-2 p-3">
      <summary className="cursor-pointer text-sm font-semibold">Community moment</summary>
      <div className="mt-3 grid gap-2">
        <input
          className="input"
          placeholder="Photo URL (https:// or /uploads/...)"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
        />
        <input
          className="input"
          placeholder="Caption (one line)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={140}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || !photoUrl || !caption}
            onClick={() => save(false)}
            className="btn btn-primary btn-sm"
          >
            {busy ? <><Loader2 className="animate-spin" size={12} /> Saving…</> : "Save"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => save(true)}
            className="btn btn-ghost btn-sm"
          >
            Clear
          </button>
        </div>
      </div>
    </details>
  );
}
