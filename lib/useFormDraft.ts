"use client";

// PRD §23.5 — Form draft auto-save.
//
// Lightweight hook: store the form state under a key in localStorage every
// 1.5s, restore on mount if found, and provide a `clear()` for callers to
// invoke after a successful submit.
//
// Intentionally minimal — no schema migration, no version, no expiry. Drafts
// live until cleared or wiped by the browser. Edge case (e.g. user navigates
// away then back the next day) is acceptable for our use.

import { useEffect, useRef, useState } from "react";

const PREFIX = "crafty_draft:";

export function useFormDraft<T>(key: string, current: T, opts?: { skip?: boolean }) {
  const ns = PREFIX + key;
  const [restored, setRestored] = useState<T | null>(null);
  const firstWrite = useRef(true);

  // On mount, check for a draft and surface it once. We deliberately don't
  // overwrite `current` directly — the caller decides whether to accept.
  useEffect(() => {
    if (opts?.skip) return;
    try {
      const raw = localStorage.getItem(ns);
      if (raw) setRestored(JSON.parse(raw));
    } catch {
      /* corrupt draft: ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Throttle writes to 1.5s after the last change.
  useEffect(() => {
    if (opts?.skip) return;
    if (firstWrite.current) {
      firstWrite.current = false;
      return;
    }
    const h = setTimeout(() => {
      try {
        localStorage.setItem(ns, JSON.stringify(current));
      } catch { /* quota or private mode */ }
    }, 1500);
    return () => clearTimeout(h);
  }, [ns, current, opts?.skip]);

  function clear() {
    try { localStorage.removeItem(ns); } catch { /* ignore */ }
    setRestored(null);
  }

  function dismiss() {
    setRestored(null);
  }

  return { restored, clear, dismiss };
}
