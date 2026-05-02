"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

type ShareButtonProps = {
  title?: string;
  text?: string;
  url?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

export function ShareButton({
  title,
  text,
  url,
  className,
  style,
  children,
}: ShareButtonProps) {
  const [toast, setToast] = useState<string | null>(null);

  async function share() {
    const shareUrl =
      url ?? (typeof window !== "undefined" ? window.location.href : "");
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text, url: shareUrl });
        return;
      } catch {
        // user cancelled or share failed; fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast("Link copied");
      window.setTimeout(() => setToast(null), 1800);
    } catch {
      setToast("Couldn't copy link");
      window.setTimeout(() => setToast(null), 1800);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        className={className ?? "btn btn-ghost"}
        style={style}
        aria-label="Share"
      >
        {children ?? (
          <>
            <Share2 size={16} aria-hidden="true" />
            Share
          </>
        )}
      </button>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-pop"
          style={{
            background: "rgb(var(--ink))",
            color: "rgb(var(--cream))",
            zIndex: 100,
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}

export default ShareButton;
