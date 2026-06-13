// Pluggable storage backend for processed image variants.
//
// Decision #15 / PRD §13 — local filesystem is the dev default, Replit Object
// Storage (or any S3-compatible service) is the prod target. The image
// processor (lib/image.ts) writes via the StorageDriver interface so
// swapping providers is a single STORAGE_DRIVER env var change, not a
// codebase-wide rewrite.

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export interface StorageDriver {
  /**
   * Persist a buffer at the given path (e.g. "profile-photos/abc-medium.webp")
   * and return a public-readable URL/path the client can use directly.
   */
  put(relativePath: string, buf: Buffer, contentType: string): Promise<string>;
}

// ─── local-filesystem driver (dev default) ────────────────────────

class LocalFsDriver implements StorageDriver {
  private root = path.join(process.cwd(), "public", "uploads");
  async put(relativePath: string, buf: Buffer): Promise<string> {
    const abs = path.join(this.root, relativePath);
    const dir = path.dirname(abs);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(abs, buf);
    return `/uploads/${relativePath}`;
  }
}

// ─── S3-compatible driver (prod target) ───────────────────────────
//
// Implemented against the AWS SDK v3's S3Client because both Replit Object
// Storage and Cloudflare R2 expose S3-compatible APIs. To activate:
//
//   STORAGE_DRIVER=s3
//   STORAGE_S3_ENDPOINT=https://...  (omit for AWS S3)
//   STORAGE_S3_REGION=auto           (Cloudflare) | us-east-1 (AWS)
//   STORAGE_S3_BUCKET=crafty-uploads
//   STORAGE_S3_PUBLIC_BASE=https://cdn.example.com/  (CDN that fronts the bucket)
//   STORAGE_S3_ACCESS_KEY_ID=...
//   STORAGE_S3_SECRET_ACCESS_KEY=...
//
// Then `bun add @aws-sdk/client-s3`. We import lazily so dev installs don't
// pull AWS SDK unless the prod path is active.

class S3Driver implements StorageDriver {
  private cfg = {
    bucket: process.env.STORAGE_S3_BUCKET!,
    publicBase: (process.env.STORAGE_S3_PUBLIC_BASE ?? "").replace(/\/$/, ""),
    endpoint: process.env.STORAGE_S3_ENDPOINT,
    region: process.env.STORAGE_S3_REGION ?? "auto",
    accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY!,
  };

  async put(relativePath: string, buf: Buffer, contentType: string): Promise<string> {
    if (!this.cfg.bucket || !this.cfg.accessKeyId || !this.cfg.secretAccessKey) {
      throw new Error("S3 storage driver missing required STORAGE_S3_* env vars");
    }
    // Lazy import so the dependency is optional unless this driver is active.
    // Use a string variable to hide the import from Next.js's static analyzer
    // so the build doesn't fail when the package isn't installed.
    const pkg = "@aws-sdk/client-s3";
    const mod = await import(/* webpackIgnore: true */ pkg).catch(() => {
      throw new Error(
        "STORAGE_DRIVER=s3 selected but @aws-sdk/client-s3 not installed. Run: bun add @aws-sdk/client-s3",
      );
    });
    const { S3Client, PutObjectCommand } = mod as {
      S3Client: new (cfg: unknown) => { send: (cmd: unknown) => Promise<unknown> };
      PutObjectCommand: new (input: unknown) => unknown;
    };
    const client = new S3Client({
      region: this.cfg.region,
      endpoint: this.cfg.endpoint,
      forcePathStyle: !!this.cfg.endpoint, // R2 / minio compatibility
      credentials: {
        accessKeyId: this.cfg.accessKeyId,
        secretAccessKey: this.cfg.secretAccessKey,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: relativePath,
        Body: buf,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${this.cfg.publicBase}/${relativePath}`;
  }
}

// ─── Vercel Blob driver (Vercel-native prod target) ───────────────
//
// Vercel's managed object storage. No external cloud account: create a Blob
// store in the Vercel dashboard (Storage -> Create -> Blob), which auto-injects
// BLOB_READ_WRITE_TOKEN into the project env. Then set STORAGE_DRIVER=blob.
// @vercel/blob is imported lazily so non-blob deploys don't load it. Returned
// URLs live on *.public.blob.vercel-storage.com (allowed in next.config).
class VercelBlobDriver implements StorageDriver {
  async put(relativePath: string, buf: Buffer, contentType: string): Promise<string> {
    const mod = await import("@vercel/blob").catch(() => {
      throw new Error(
        "STORAGE_DRIVER=blob but @vercel/blob is not installed. Run: bun add @vercel/blob",
      );
    });
    const { put } = mod as {
      put: (
        path: string,
        body: Buffer,
        opts: {
          access: "public";
          contentType?: string;
          token?: string;
          addRandomSuffix?: boolean;
          allowOverwrite?: boolean;
          cacheControlMaxAge?: number;
        },
      ) => Promise<{ url: string }>;
    };
    const { url } = await put(relativePath, buf, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 31536000,
    });
    return url;
  }
}

// ─── factory ──────────────────────────────────────────────────────

let _driver: StorageDriver | null = null;
export function getStorage(): StorageDriver {
  if (_driver) return _driver;
  const which = process.env.STORAGE_DRIVER ?? "local";
  _driver =
    which === "blob" ? new VercelBlobDriver()
      : which === "s3" ? new S3Driver()
        : new LocalFsDriver();
  return _driver;
}
