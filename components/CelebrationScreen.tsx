"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, Check, Mail, Instagram, MessageCircle, X } from "lucide-react";

type CelebrationScreenProps = {
  city: string;
  url: string;
  name: string;
  onContinue: () => void;
};

export function CelebrationScreen({ city, url, name, onContinue }: CelebrationScreenProps) {
  const [copied, setCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Focus trap: CelebrationScreen is always "open" while mounted.
  // Trap Tab / Shift+Tab inside the dialog and restore focus on unmount.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, []);

  // Confetti — dynamic import, optional dependency, respects reduced motion.
  // TODO(Lane 3): once canvas-confetti is in package.json, this will fire.
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let cancelled = false;
    (async () => {
      try {
        const mod = await import("canvas-confetti");
        if (cancelled) return;
        const confetti = mod.default;
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#FF90E8", "#FFD166", "#06D6A0", "#118AB2"],
        });
      } catch {
        // canvas-confetti not installed yet — silently skip.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Couldn't copy — try selecting the URL.");
    }
  }

  async function copyForInstagram() {
    const text = `Find me on Crafty: ${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setIgCopied(true);
      showToast("Copied! Paste into your Instagram bio or story.");
      window.setTimeout(() => setIgCopied(false), 2000);
    } catch {
      showToast("Couldn't copy — try selecting the URL.");
    }
  }

  const waText = encodeURIComponent(`I just went live on Crafty in ${city}! ${url}`);
  const mailSubject = encodeURIComponent(`I'm now on Crafty — ${name}`);
  const mailBody = encodeURIComponent(
    `I just went live on Crafty in ${city}.\n\nMy profile: ${url}\n\n— ${name}`
  );

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/95 p-4 backdrop-blur"
    >
      <button
        type="button"
        onClick={onContinue}
        aria-label="Close celebration"
        className="absolute right-4 top-4 rounded-full p-2 text-ink-muted hover:bg-canvas-sunken hover:text-ink"
      >
        <X size={20} />
      </button>

      <div className="card mx-auto w-full max-w-xl space-y-6 p-8 text-center shadow-pop">
        <h1 id="celebration-title" className="text-3xl font-bold leading-tight">
          You're live in {city} <span aria-hidden>🌻</span>
        </h1>

        <p className="text-sm text-ink-muted">
          Share your Crafty link wherever your people hang out.
        </p>

        {/* URL + copy */}
        <div className="flex items-stretch gap-2 rounded-lg border border-line bg-canvas-sunken p-1">
          <span className="flex-1 truncate self-center px-3 py-2 text-left text-sm font-medium">
            {url}
          </span>
          <button
            type="button"
            onClick={copyUrl}
            className="btn btn-sm"
            aria-label="Copy live URL"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Share row */}
        <div className="grid grid-cols-3 gap-2">
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
          <button type="button" onClick={copyForInstagram} className="btn">
            <Instagram size={16} /> {igCopied ? "Copied" : "Instagram"}
          </button>
          <a
            href={`mailto:?subject=${mailSubject}&body=${mailBody}`}
            className="btn"
          >
            <Mail size={16} /> Email
          </a>
        </div>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Link
            href={url}
            className="text-sm font-semibold text-ink underline-offset-4 hover:underline"
          >
            View my profile →
          </Link>
          <button type="button" onClick={onContinue} className="btn-ghost btn btn-sm">
            Continue to dashboard
          </button>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-canvas shadow-pop"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default CelebrationScreen;
