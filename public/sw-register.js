// V3 — service-worker bootstrap.
//
// Loaded with strategy="afterInteractive" so it never blocks LCP. We skip
// registration entirely if the browser doesn't support SW (older Safari,
// some embedded WebViews) or if we're on localhost over http without
// a serviceWorker context.

(function () {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  // Avoid double-registering during HMR in dev.
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(function (err) {
        // Silent fail: SW is a progressive enhancement.
        console.warn("[crafty] SW registration failed:", err && err.message);
      });
  });
})();
