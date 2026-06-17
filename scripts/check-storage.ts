// One-shot storage smoke test. Writes a tiny object through the ACTIVE
// StorageDriver (lib/storage.ts, selected by STORAGE_DRIVER) and, for remote
// drivers, fetches the returned public URL to prove the write round-trips to a
// readable URL — without needing the full upload UI.
//
// Usage:
//   STORAGE_DRIVER=blob bunx tsx --env-file=.env scripts/check-storage.ts
//   STORAGE_DRIVER=s3   bunx tsx --env-file=.env scripts/check-storage.ts
//   STORAGE_DRIVER=local bunx tsx scripts/check-storage.ts   (writes to public/uploads)
//
// Exit 0 = storage works; exit 1 = misconfigured (bad/missing creds, private
// bucket, etc.). This is task 1.3 of the production-launch-readiness change and
// backs the "upload-persists" smoke item in the production-deployment spec.

import { getStorage } from "@/lib/storage";

async function main() {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  const stamp = `${Date.now()}`;
  const key = `health/storage-check-${stamp}.txt`;
  const marker = `crafty storage check ${new Date().toISOString()}`;
  const body = Buffer.from(marker, "utf8");

  console.log(`[check-storage] driver=${driver} key=${key}`);
  const url = await getStorage().put(key, body, "text/plain");
  console.log(`[check-storage] put -> ${url}`);

  if (/^https?:\/\//.test(url)) {
    const res = await fetch(url);
    console.log(`[check-storage] GET ${url} -> ${res.status}`);
    if (!res.ok) {
      console.error("[check-storage] FAIL: public URL is not readable (private bucket / wrong public base?)");
      process.exit(1);
    }
    const text = await res.text();
    if (!text.includes("crafty storage check")) {
      console.error("[check-storage] FAIL: fetched content did not match what was written");
      process.exit(1);
    }
  } else {
    console.log(`[check-storage] local driver returned a relative path (${url}); not publicly fetchable from this script — fine for dev.`);
  }

  console.log("[check-storage] OK ✓");
}

main().catch((e) => {
  console.error("[check-storage] ERROR", e);
  process.exit(1);
});
