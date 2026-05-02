// Issue 1.3 — server-proxied upload + sync sharp variants.
// Local dev: writes to public/uploads/* and returns /uploads/... URLs.
// Production: swap writeFile() for the Replit Object Storage client + return public CDN URL.

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import crypto from "node:crypto";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per §13.3

export type Variant = "thumb" | "medium" | "full";
const VARIANT_WIDTHS: Record<Variant, number> = { thumb: 320, medium: 800, full: 1600 };

export type Folder = "profile-photos" | "portfolio" | "event-covers";

export type UploadResult = {
  full: string;    // primary URL stored on the entity
  medium: string;
  thumb: string;
};

// Format names sharp returns for our allowlisted MIME types.
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export async function processAndStoreImage(
  buffer: Buffer,
  mime: string,
  folder: Folder,
): Promise<UploadResult> {
  if (!ALLOWED_MIME.has(mime)) throw new Error("UNSUPPORTED_MIME");
  if (buffer.byteLength > MAX_BYTES) throw new Error("FILE_TOO_LARGE");

  // S3 — magic-byte validation. The client-supplied MIME is untrusted; an
  // attacker can lie. Ask sharp to actually decode the header and tell us
  // what format it really is. Reject anything outside the allowlist
  // (specifically blocks SVG, GIF, AVIF inputs and any non-image payload).
  let realFormat: string | undefined;
  try {
    realFormat = (await sharp(buffer).metadata()).format;
  } catch {
    throw new Error("UNSUPPORTED_MIME");
  }
  if (!realFormat || !ALLOWED_FORMATS.has(realFormat)) {
    throw new Error("UNSUPPORTED_MIME");
  }

  const id = crypto.randomBytes(12).toString("hex");
  const baseDir = path.join(process.cwd(), "public", "uploads", folder);
  if (!existsSync(baseDir)) await mkdir(baseDir, { recursive: true });

  // Decode + auto-orient + strip metadata once
  const base = sharp(buffer).rotate().withMetadata({});

  const out: Record<Variant, string> = { thumb: "", medium: "", full: "" };
  for (const variant of ["thumb", "medium", "full"] as const) {
    const filename = `${id}-${variant}.webp`;
    const abs = path.join(baseDir, filename);
    await base
      .clone()
      .resize({ width: VARIANT_WIDTHS[variant], withoutEnlargement: true })
      .webp({ quality: variant === "thumb" ? 70 : 82 })
      .toFile(abs);
    out[variant] = `/uploads/${folder}/${filename}`;
  }
  return out;
}
