"use client";

// V2 / V3 — Review form. V3 Tier 2 adds photo uploads (up to 4) to give
// reviews richer trust signals. Matches the StoreForm / ProductForm upload
// pattern: click to add → server returns medium variant URL → preview thumbs.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Star, Loader2, Upload, X } from "lucide-react";

type Props = {
  entityType: "CRAFTER" | "STORE" | "STUDIO";
  entityId: string;
  initialRating: number;
  initialBody: string;
  initialPhotos?: string[];
  initialPhotoBlurhashes?: string[];
  existingId: string | null;
};

const MAX_PHOTOS = 4;

export function ReviewForm({
  entityType, entityId, initialRating, initialBody,
  initialPhotos, initialPhotoBlurhashes, existingId,
}: Props) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(initialBody);
  const [photos, setPhotos] = useState<string[]>(initialPhotos ?? []);
  const [blurhashes, setBlurhashes] = useState<string[]>(initialPhotoBlurhashes ?? []);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    setUploading(true);
    setError(null);
    try {
      const results = await Promise.all(
        files.slice(0, remaining).map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/upload?folder=review-photos", { method: "POST", body: fd });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error ?? "upload_failed");
          }
          const j = (await res.json()) as { medium: string; blurhash: string };
          return { url: j.medium, blurhash: j.blurhash ?? "" };
        }),
      );
      setPhotos((p) => [...p, ...results.map((r) => r.url)]);
      setBlurhashes((b) => [...b, ...results.map((r) => r.blurhash)]);
    } catch (e: any) {
      setError(e.message ?? "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removePhoto(i: number) {
    setPhotos((p) => p.filter((_, idx) => idx !== i));
    setBlurhashes((b) => b.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (rating < 1) {
      setError("Pick a rating.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          rating,
          body: body || null,
          photos,
          photo_blurhashes: blurhashes,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "save_failed");
      }
      setDone(true);
      router.refresh();
    } catch (e: any) {
      setError(e.message === "cannot_review_own_listing" ? "You can't review your own listing." : "Couldn't save — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="rounded-md bg-canvas-sunken p-3 text-sm text-success">Review saved. Thanks!</p>;
  }

  return (
    <div className="card p-4">
      <p className="text-sm font-semibold text-ink">{existingId ? "Update your review" : "Leave a review"}</p>
      <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = (hover || rating) >= n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="rounded-md p-1 transition-transform hover:scale-110"
            >
              <Star
                size={22}
                fill={active ? "rgb(var(--mustard))" : "none"}
                stroke="rgb(var(--mustard))"
              />
            </button>
          );
        })}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="What did you like? (Optional.)"
        className="input mt-3 resize-y"
      />

      <div className="mt-3">
        <label
          htmlFor={`review-photos-${entityId}`}
          className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-line bg-canvas-raised p-3 text-sm text-ink-muted hover:border-ink"
        >
          {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
          <span>
            {uploading
              ? "Uploading…"
              : photos.length >= MAX_PHOTOS
                ? `${MAX_PHOTOS} photos added (max)`
                : `Add photos (optional, up to ${MAX_PHOTOS})`}
          </span>
          <input
            id={`review-photos-${entityId}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={onUpload}
            disabled={uploading || photos.length >= MAX_PHOTOS}
          />
        </label>

        {photos.length > 0 && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {photos.map((u, i) => (
              <div key={u + i} className="relative h-20 w-full overflow-hidden rounded-md bg-canvas-sunken">
                <Image src={u} alt={`Review photo ${i + 1}`} fill sizes="120px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 rounded-full bg-canvas/90 p-0.5 text-ink-muted hover:text-danger"
                  aria-label="Remove photo"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={busy || rating < 1}
        className="btn btn-primary btn-sm mt-3"
      >
        {busy ? <><Loader2 className="animate-spin" size={12} /> Saving…</> : existingId ? "Update review" : "Submit review"}
      </button>
    </div>
  );
}
