import { z } from "zod";

// Validates that a photo URL actually came from our own /api/upload pipeline,
// for whichever STORAGE_DRIVER is active:
//   - local  -> "/uploads/..."  (same-origin path)
//   - blob   -> "https://<id>.public.blob.vercel-storage.com/..."
//   - s3/r2  -> "<STORAGE_S3_PUBLIC_BASE>/..."
// Rejects arbitrary external https URLs (S12 — stops an attacker storing a
// tracker / phishing pixel that we'd render as og:image and on public profiles).
//
// Previously each route hardcoded z.string().startsWith("/uploads/"), which
// broke the moment storage moved off the local-disk driver.
export function isUploadedImageUrl(s: string): boolean {
  if (s.startsWith("/uploads/")) return true;
  if (/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(s)) return true;
  const base = process.env.STORAGE_S3_PUBLIC_BASE;
  if (base && s.startsWith(base.replace(/\/+$/, "") + "/")) return true;
  return false;
}

export const uploadedImageUrl = z
  .string()
  .max(1000)
  .refine(isUploadedImageUrl, { message: "must be an uploaded image URL from this site" });
