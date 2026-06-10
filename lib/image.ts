// Issue 1.3 / Decision #15 — server-proxied upload + sync sharp variants.
//
// Image bytes go through `getStorage()` (lib/storage.ts) which picks a backend
// at runtime via STORAGE_DRIVER env var: "local" (default, writes to
// public/uploads) or "s3" (Replit Object Storage / R2 / AWS S3). The processor
// itself doesn't care where bytes land — it only knows about sharp transforms.

import sharp from "sharp";
import crypto from "node:crypto";
import { getStorage } from "./storage";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per §13.3

export type Variant = "thumb" | "medium" | "full";
const VARIANT_WIDTHS: Record<Variant, number> = { thumb: 320, medium: 800, full: 1600 };

export type Folder = "profile-photos" | "portfolio" | "event-covers" | "product-photos" | "review-photos";

export type UploadResult = {
  full: string;    // primary URL stored on the entity
  medium: string;
  thumb: string;
  blurhash: string; // base64 data URL suitable as next/image blurDataURL
};

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export async function processAndStoreImage(
  buffer: Buffer,
  mime: string,
  folder: Folder,
): Promise<UploadResult> {
  if (!ALLOWED_MIME.has(mime)) throw new Error("UNSUPPORTED_MIME");
  if (buffer.byteLength > MAX_BYTES) throw new Error("FILE_TOO_LARGE");

  // S3 — magic-byte validation. The client-supplied MIME is untrusted; ask
  // sharp to actually decode the header and reject anything outside the
  // allowlist (blocks SVG/GIF/AVIF inputs and any non-image payload).
  let realFormat: string | undefined;
  try {
    realFormat = (await sharp(buffer).metadata()).format;
  } catch {
    throw new Error("UNSUPPORTED_MIME");
  }
  if (!realFormat || !ALLOWED_FORMATS.has(realFormat)) {
    throw new Error("UNSUPPORTED_MIME");
  }

  const storage = getStorage();
  const id = crypto.randomBytes(12).toString("hex");

  // Decode + auto-orient + strip metadata once
  const base = sharp(buffer).rotate().withMetadata({});

  const out: Record<Variant, string> = { thumb: "", medium: "", full: "" };
  for (const variant of ["thumb", "medium", "full"] as const) {
    const filename = `${folder}/${id}-${variant}.webp`;
    const buf = await base
      .clone()
      .resize({ width: VARIANT_WIDTHS[variant], withoutEnlargement: true })
      .webp({ quality: variant === "thumb" ? 70 : 82 })
      .toBuffer();
    out[variant] = await storage.put(filename, buf, "image/webp");
  }

  // Tiny base64-encoded JPEG suitable as next/image blurDataURL.
  let blurhash = "";
  try {
    const tiny = await base
      .clone()
      .resize(16, 16, { fit: "inside" })
      .jpeg({ quality: 50 })
      .toBuffer();
    blurhash = `data:image/jpeg;base64,${tiny.toString("base64")}`;
  } catch {
    // Best-effort; cards fall back to bg-canvas-sunken if blurhash is empty.
  }

  return { ...out, blurhash };
}
