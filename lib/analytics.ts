"use client";

// T5 — Client-side analytics wrapper. PRD §16.2 event list.
//
// Design:
//   - Initialize PostHog once on first call. If the publishable key is missing
//     or still a placeholder, every track() becomes a no-op so dev never
//     ships fake events.
//   - First-touch UTM is captured into a 14-day cookie so signup events
//     downstream of the initial landing can include `signup_source` even if
//     the user spends several visits before signing up.
//
// Server-side events (e.g. profile_completed fired from an API route) should
// use posthog-node — not added here yet; client-fire from the celebration
// screen is fine for V1.

import posthog from "posthog-js";

let _initialized = false;

export function initPostHog(): boolean {
  if (_initialized) return true;
  if (typeof window === "undefined") return false;
  const key =
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ??
    process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
  if (!key || key.startsWith("phc_placeholder")) return false;
  posthog.init(key, {
    api_host: host,
    defaults: "2026-01-30",
    capture_pageview: false, // we fire session_start ourselves with extra context
    persistence: "localStorage+cookie",
    autocapture: false,      // explicit events only; cuts noise
  });
  _initialized = true;
  return true;
}

export function track(event: string, props: Record<string, unknown> = {}): void {
  if (!_initialized) return;
  try { posthog.capture(event, props); } catch { /* swallow */ }
}

export function identify(userId: string, props: Record<string, unknown> = {}): void {
  if (!_initialized) return;
  try { posthog.identify(userId, props); } catch { /* swallow */ }
}

// ─── First-touch UTM capture ────────────────────────────────────────
// Persisted across visits via cookie. Read by signup_started /
// signup_completed events so we never lose attribution to the original
// referral channel (Insta reel, WhatsApp broadcast, etc.).

const SIGNUP_SOURCE_COOKIE = "crafty_signup_source";
const SIGNUP_SOURCE_TTL = 60 * 60 * 24 * 14; // 14 days

type SignupSource = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
};

export function captureFirstTouchUtm(): void {
  if (typeof window === "undefined") return;
  if (document.cookie.split("; ").some((c) => c.startsWith(`${SIGNUP_SOURCE_COOKIE}=`))) return;
  const params = new URLSearchParams(window.location.search);
  const utm: SignupSource = {
    utm_source: params.get("utm_source") ?? undefined,
    utm_medium: params.get("utm_medium") ?? undefined,
    utm_campaign: params.get("utm_campaign") ?? undefined,
    referrer: document.referrer || "direct",
  };
  if (!utm.utm_source && !utm.utm_medium && !utm.utm_campaign && utm.referrer === "direct") return;
  const value = encodeURIComponent(JSON.stringify(utm));
  document.cookie = `${SIGNUP_SOURCE_COOKIE}=${value}; path=/; max-age=${SIGNUP_SOURCE_TTL}; SameSite=Lax`;
}

export function readFirstTouchUtm(): SignupSource | null {
  if (typeof window === "undefined") return null;
  const c = document.cookie.split("; ").find((c) => c.startsWith(`${SIGNUP_SOURCE_COOKIE}=`));
  if (!c) return null;
  try { return JSON.parse(decodeURIComponent(c.split("=")[1])); }
  catch { return null; }
}
