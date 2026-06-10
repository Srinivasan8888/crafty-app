"use client";

// Client-only PostHog initializer. Mounted once in app/layout.tsx.
// Fires `session_start` (PRD §16.2) on first mount with UTM + referrer + path.
// On subsequent route changes inside the SPA we currently DO NOT fire
// session_start again — that event is intentionally first-visit-only per the
// "session" semantics. Route-level views are tracked by profile_view in the
// detail pages themselves.

import { useEffect } from "react";
import { initPostHog, track, captureFirstTouchUtm, readFirstTouchUtm } from "@/lib/analytics";
import { hasAnalyticsConsent } from "@/components/CookieConsent";

export function PostHogProvider() {
  useEffect(() => {
    // PRD §21 — only initialize if user has consented.
    if (!hasAnalyticsConsent()) return;
    const initialized = initPostHog();
    captureFirstTouchUtm();
    if (!initialized) return;

    const params = new URLSearchParams(window.location.search);
    const utm = readFirstTouchUtm() ?? {};
    track("session_start", {
      path: window.location.pathname,
      utm_source: params.get("utm_source") ?? utm.utm_source ?? null,
      utm_medium: params.get("utm_medium") ?? utm.utm_medium ?? null,
      utm_campaign: params.get("utm_campaign") ?? utm.utm_campaign ?? null,
      referrer: document.referrer || utm.referrer || "direct",
    });
  }, []);
  return null;
}
