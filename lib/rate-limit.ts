import type { NextRequest } from "next/server";

/**
 * Simple in-memory token bucket per IP.
 *
 * - 30 requests / 60s window per IP by default
 * - Process-local (resets on deploy / not shared across instances)
 * - Suitable for V1 hardening; swap for Upstash/Redis for multi-instance prod
 *
 * Hardenings (S9):
 *   - Bounded Map size with LRU-ish eviction so a flood of unique IPs
 *     can't exhaust process memory.
 *   - IP derivation prefers platform-set headers we can trust (Vercel,
 *     Fly, Cloudflare) and falls back to the rightmost XFF entry rather
 *     than the leftmost (which an attacker can easily forge).
 */

type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 30;
const MAX_BUCKETS = 10_000;            // hard cap to bound memory
const EVICT_TARGET = MAX_BUCKETS * 0.9; // drop to here when we hit MAX

const buckets = new Map<string, Bucket>();

function getClientIp(req: NextRequest): string {
  // 1. Trusted platform headers — set by the edge and not spoofable
  //    by upstream clients.
  const trusted =
    req.headers.get("x-vercel-forwarded-for") ??
    req.headers.get("fly-client-ip") ??
    req.headers.get("cf-connecting-ip");
  if (trusted) return trusted.split(",")[0].trim();

  // 2. Fallback to standard XFF. The LAST entry is the IP the most-recent
  //    proxy saw; the LEFT entries are caller-controlled and can be forged.
  //    For a single-proxy deploy (Replit / generic Node behind a load
  //    balancer) the rightmost element is the correct value.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }

  return req.headers.get("x-real-ip") ?? "unknown";
}

function evictIfNeeded(): void {
  if (buckets.size < MAX_BUCKETS) return;
  // Evict expired buckets first.
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
    if (buckets.size <= EVICT_TARGET) return;
  }
  // If still over, drop the oldest insertion-order entries (Map preserves it).
  for (const k of buckets.keys()) {
    if (buckets.size <= EVICT_TARGET) return;
    buckets.delete(k);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** ms until the current window resets */
  resetIn: number;
}

/**
 * Check + record one hit against the rate limit.
 *
 * @param req  the NextRequest (used to derive the client IP)
 * @param key  optional namespace, lets callers split limits per-route
 *             (e.g. `rateLimit(req, "saves")`). Defaults to a global bucket.
 */
export function rateLimit(
  req: NextRequest,
  key?: string,
  limit: number = DEFAULT_LIMIT,
): RateLimitResult {
  const ip = getClientIp(req);
  const bucketKey = key ? `${key}:${ip}` : ip;
  const now = Date.now();

  let bucket = buckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    evictIfNeeded();
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(bucketKey, bucket);
  }

  bucket.count += 1;
  const resetIn = Math.max(0, bucket.resetAt - now);
  return { allowed: bucket.count <= limit, resetIn };
}

/** Test helper — clears all buckets. */
export function __resetRateLimitForTests(): void {
  buckets.clear();
}
