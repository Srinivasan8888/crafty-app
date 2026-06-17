// V3 — service-worker bootstrap.
//
// Loaded with strategy="afterInteractive" so it never blocks LCP.
//
// IMPORTANT: the SW is PRODUCTION-ONLY. In dev, Next's chunks keep stable
// filenames (webpack.js, main-app.js) but change contents every rebuild, so a
// CacheFirst SW serves a stale chunk whose module IDs no longer match the fresh
// HTML — producing "TypeError: Cannot read properties of undefined (reading
// 'call')" at options.factory. So on localhost we never register, and we
// actively unregister any previously-installed SW + clear its caches to
// self-heal a machine that already got stuck.

(function () {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  var host = location.hostname;
  var isDev =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "0.0.0.0" ||
    host.endsWith(".local");

  if (isDev) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) {
        r.unregister();
      });
    });
    if (window.caches && caches.keys) {
      caches.keys().then(function (keys) {
        keys.forEach(function (k) {
          caches.delete(k);
        });
      });
    }
    return;
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(function (err) {
        // Silent fail: SW is a progressive enhancement.
        console.warn("[crafty] SW registration failed:", err && err.message);
      });
  });
})();
