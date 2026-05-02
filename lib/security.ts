// Cross-cutting security helpers shared by API route handlers.
// Each function is small and side-effect-free so it's trivially unit-testable.

import type { NextRequest } from "next/server";

const SAFE_FALLBACK = "/";

/**
 * Validate a Referer header against the request origin and return a safe
 * redirect path. Used by /api/saves' form-encoded fallback (POST → 303).
 *
 * Without this, an attacker can host a cross-origin form whose POST sets the
 * Referer to an evil-looking URL and we mirror it back, enabling phishing.
 *
 * Returns the original referer ONLY if its origin matches the request's.
 * Falls back to "/" otherwise (or on parse failure).
 */
export function safeReferer(req: NextRequest): string {
  const ref = req.headers.get("referer");
  if (!ref) return SAFE_FALLBACK;
  try {
    const refUrl = new URL(ref);
    const reqUrl = new URL(req.url);
    return refUrl.origin === reqUrl.origin ? ref : SAFE_FALLBACK;
  } catch {
    return SAFE_FALLBACK;
  }
}

/**
 * Verify that a state-changing request originates from the same origin as
 * the server (CSRF defense in depth on top of SameSite cookies).
 *
 * Honors `Origin` first (always set by browsers on POST), falling back to
 * `Referer` for older clients. In dev mode (no SITE_URL configured) we
 * accept localhost on any port. In prod, NEXT_PUBLIC_SITE_URL must be set
 * and exactly match the incoming Origin host.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const expected = process.env.NEXT_PUBLIC_SITE_URL;
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) {
    // Same-origin XHR/fetch from a same-site page may omit Origin in some
    // browsers. We still want to allow these — the route's own auth gate
    // is the authoritative check.
    return true;
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  if (expected) {
    try {
      return originHost === new URL(expected).host;
    } catch {
      return false;
    }
  }
  // Dev fallback: accept localhost / 127.0.0.1 on any port + the request's own host.
  const reqHost = new URL(req.url).host;
  return (
    originHost === reqHost ||
    originHost.startsWith("localhost:") ||
    originHost.startsWith("127.0.0.1:") ||
    originHost === "localhost" ||
    originHost === "127.0.0.1"
  );
}
