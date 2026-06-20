"use client";

// Keeps the open conversation fresh without a manual reload. Calls
// router.refresh() on an interval and whenever the tab regains focus, and
// pauses while the tab is hidden (no point polling a backgrounded thread).
// router.refresh() re-runs the server component, which also re-advances the
// read pointer. No websocket, no extra endpoint.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function MessagesAutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const start = () => {
      if (timer == null) {
        timer = setInterval(() => {
          if (!document.hidden) router.refresh();
        }, intervalMs);
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        router.refresh();
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
