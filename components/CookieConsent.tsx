"use client";

// PRD §21 — Cookie consent (DPDP / GDPR-style). On first visit the banner asks
// the user to accept analytics. The decision is stored in a 1-year cookie so
// repeat visits skip the banner. PostHogProvider checks the consent value
// before initializing analytics.

import { useEffect, useState } from "react";

export const CONSENT_COOKIE = "crafty_consent";

type Decision = "accepted" | "declined";

function readCookie(): Decision | null {
  if (typeof document === "undefined") return null;
  const c = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!c) return null;
  const v = c.split("=")[1];
  return v === "accepted" || v === "declined" ? (v as Decision) : null;
}

function writeCookie(v: Decision): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CONSENT_COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function hasAnalyticsConsent(): boolean {
  return readCookie() === "accepted";
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readCookie() === null) setVisible(true);
  }, []);

  function decide(v: Decision) {
    writeCookie(v);
    setVisible(false);
    // Reload so PostHogProvider sees the new consent and initializes (or stays off).
    if (v === "accepted") window.location.reload();
  }

  if (!visible) return null;
  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl rounded-lg border border-line-strong bg-canvas-raised p-4 shadow-soft-lg"
    >
      <p id="consent-title" className="text-sm text-ink">
        We use a small set of cookies for sign-in and (with your consent) anonymous analytics
        to understand which crafters are getting discovered. No third-party advertising.
      </p>
      <p className="mt-1 text-xs text-ink-subtle">
        See <a href="/privacy" className="underline">our privacy policy</a> for the full list.
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={() => decide("declined")} className="btn btn-ghost btn-sm">
          Decline analytics
        </button>
        <button type="button" onClick={() => decide("accepted")} className="btn btn-primary btn-sm">
          Accept all
        </button>
      </div>
    </div>
  );
}
