"use client";

// V3 — PWA install pill.
//
// Listens for `beforeinstallprompt` (Chrome / Edge / Samsung Internet), shows
// a small bottom-right pill with two actions: Install / Dismiss. The dismiss
// is sticky for 30 days via localStorage so it doesn't nag users that don't
// want to install.
//
// Safari / iOS doesn't fire `beforeinstallprompt`. We don't bother with a
// "tap share → add to home screen" tutorial in V3 — Apple users get the
// manifest's standalone behaviour if they manually add to home screen, and
// that's enough for MVP.

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "crafty_install_dismissed_at";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (recentlyDismissed()) return;
    // If already installed (running standalone), don't show.
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    }
    function onInstalled() {
      setVisible(false);
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !deferred) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "dismissed") dismiss();
      else setVisible(false);
    } catch {
      setVisible(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Install Crafty"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "rgb(var(--cream))",
        border: "1px solid var(--line-strong)",
        borderRadius: "var(--r-pill)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        padding: "8px 10px 8px 14px",
        fontSize: 13,
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgb(var(--magenta))",
          color: "#fff",
          borderRadius: 6,
          width: 22,
          height: 22,
        }}
      >
        <Download size={13} />
      </span>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
        Install Crafty
      </span>
      <button
        type="button"
        onClick={install}
        className="btn btn-primary btn-sm"
        style={{ padding: "4px 10px", fontSize: 12 }}
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        style={{
          background: "transparent",
          border: 0,
          padding: 6,
          cursor: "pointer",
          color: "rgb(var(--muted))",
          display: "inline-flex",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
