// V3 Tier 3 — Open Read API key plumbing.
//
// Each ApiKey row stores a SHA-256 hash of a `crafty_<32hex>` bearer token.
// The plaintext secret is shown to the operator exactly once at create time;
// the DB never sees it again. We rate-limit per-(api_key.id, current minute)
// in-memory and write `last_used_at` at most once per minute to avoid burning
// a DB write on every hot-path request.

import crypto from "node:crypto";
import { prisma } from "./db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PREFIX = "crafty_";
const SECRET_BYTES = 16; // -> 32 hex chars

export type GeneratedKey = {
  full: string;       // "crafty_<32hex>" — show once
  prefix: string;     // first 8 chars of the hex (for display)
  keyHash: string;    // sha256(full)
};

export function generateApiKey(): GeneratedKey {
  const hex = crypto.randomBytes(SECRET_BYTES).toString("hex"); // 32 hex
  const full = `${PREFIX}${hex}`;
  const keyHash = sha256(full);
  return { full, prefix: hex.slice(0, 8), keyHash };
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// In-memory caches. Single-process scope is fine for V3 — when we move to
// multi-instance we'll swap for Upstash/Redis (same as rate-limit.ts).
type Bucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, Bucket>();
const lastUsedTouched = new Map<string, number>(); // api_key.id -> ms timestamp

const WINDOW_MS = 60_000;
const LAST_USED_THROTTLE_MS = 60_000;

export type ApiKeyAuthResult =
  | { ok: true; keyId: string; ownerUserId: string | null; scopes: string[] }
  | { ok: false; status: number; error: string; retryAfter?: number };

/**
 * Authenticate a request against the open-read API.
 *
 * Looks for `Authorization: Bearer crafty_<hex>`, hashes it, finds the row,
 * and enforces revocation + rate limit. On success, lazily writes
 * `last_used_at` (max once per minute per key).
 */
export async function authenticateApiKey(
  req: NextRequest,
  requiredScope = "read:public",
): Promise<ApiKeyAuthResult> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(crafty_[a-f0-9]{32})$/i);
  if (!match) {
    return { ok: false, status: 401, error: "missing_or_malformed_api_key" };
  }
  const full = match[1];
  const keyHash = sha256(full);

  const key = await prisma.apiKey.findUnique({
    where: { key_hash: keyHash },
    select: {
      id: true, owner_user_id: true, scopes: true,
      revoked_at: true, rate_limit_per_min: true,
    },
  });
  if (!key || key.revoked_at) {
    return { ok: false, status: 401, error: "invalid_api_key" };
  }
  if (!key.scopes.includes(requiredScope) && !key.scopes.includes("read:*")) {
    return { ok: false, status: 403, error: "insufficient_scope" };
  }

  // Rate-limit per-(key, minute window).
  const now = Date.now();
  const bucketKey = `apikey:${key.id}`;
  let bucket = rateBuckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    rateBuckets.set(bucketKey, bucket);
  }
  bucket.count += 1;
  if (bucket.count > key.rate_limit_per_min) {
    return {
      ok: false, status: 429, error: "rate_limited",
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  // Touch `last_used_at` at most once per minute per key.
  const touchedAt = lastUsedTouched.get(key.id) ?? 0;
  if (now - touchedAt > LAST_USED_THROTTLE_MS) {
    lastUsedTouched.set(key.id, now);
    void prisma.apiKey
      .update({ where: { id: key.id }, data: { last_used_at: new Date() } })
      .catch(() => {}); // best-effort
  }

  return {
    ok: true, keyId: key.id,
    ownerUserId: key.owner_user_id,
    scopes: key.scopes,
  };
}

export function apiKeyError(result: ApiKeyAuthResult & { ok: false }): NextResponse {
  const headers: Record<string, string> = {};
  if (result.retryAfter) headers["Retry-After"] = String(result.retryAfter);
  return NextResponse.json({ error: result.error }, { status: result.status, headers });
}

/** Standard cache headers for read-public API responses. */
export const PUBLIC_API_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
};
