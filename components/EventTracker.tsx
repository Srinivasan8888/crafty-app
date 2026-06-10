"use client";

// Tiny client-only tracker. Mount inside any server component to fire a
// PostHog event on first paint without making the whole page client.
//
// Once-semantics: when `dedupKey` is provided, the event fires at most once
// per browser. Used for signup_completed to avoid re-firing on every
// dashboard visit.

import { useEffect } from "react";
import { track, readFirstTouchUtm } from "@/lib/analytics";

const DEDUP_PREFIX = "crafty_event_fired:";

export function EventTracker({
  name,
  props = {},
  dedupKey,
  includeSignupSource = false,
}: {
  name: string;
  props?: Record<string, unknown>;
  dedupKey?: string;
  includeSignupSource?: boolean;
}) {
  useEffect(() => {
    if (dedupKey) {
      const k = DEDUP_PREFIX + dedupKey;
      if (typeof window !== "undefined" && localStorage.getItem(k)) return;
      if (typeof window !== "undefined") localStorage.setItem(k, "1");
    }
    const enriched: Record<string, unknown> = { ...props };
    if (includeSignupSource) {
      const utm = readFirstTouchUtm();
      if (utm) {
        enriched.signup_source = utm.utm_source ?? null;
        enriched.signup_medium = utm.utm_medium ?? null;
        enriched.signup_campaign = utm.utm_campaign ?? null;
        enriched.signup_referrer = utm.referrer ?? "direct";
      }
    }
    track(name, enriched);
  }, [name, dedupKey, includeSignupSource]);
  return null;
}
