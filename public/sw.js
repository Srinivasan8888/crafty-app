// V3 — Crafty service worker.
//
// Hand-rolled (no next-pwa) so we keep the dependency footprint tiny and
// understand exactly what's cached. Three caches:
//
//   crafty-shell-v1     precache: navigation shell + static essentials
//   crafty-runtime-v1   runtime cache: API + image responses
//   crafty-offline-v1   the offline fallback page
//
// SKIP rules: anything personal or mutating (dashboard, admin, sign-in,
// cart, orders, messages) is NEVER cached. We pass straight to the network.

// Bump these on any SW behavior change. The activate handler deletes every
// cache not in the kept-set, so bumping versions purges stale precached chunks
// from already-installed clients (the browser fetches /sw.js fresh on update
// checks, so a changed file here propagates even past the SW's own cache).
const SHELL_CACHE = "crafty-shell-v2";
const RUNTIME_CACHE = "crafty-runtime-v2";
const OFFLINE_CACHE = "crafty-offline-v2";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/",
  "/bengaluru",
  "/manifest.webmanifest",
  "/robots.txt",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

// URL substrings that mean "never cache, always go to network."
const NEVER_CACHE = [
  "/dashboard",
  "/admin",
  "/sign-in",
  "/sign-up",
  "/api/cart",
  "/api/orders",
  "/api/messages",
  "/api/auth",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((c) =>
        // Use addAll best-effort — if a precache URL 404s in dev we don't
        // want to bail the whole install.
        Promise.all(PRECACHE_URLS.map((u) => c.add(u).catch(() => {}))),
      ),
      caches.open(OFFLINE_CACHE).then((c) => c.add(OFFLINE_URL).catch(() => {})),
    ]).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const kept = new Set([SHELL_CACHE, RUNTIME_CACHE, OFFLINE_CACHE]);
      await Promise.all(keys.filter((k) => !kept.has(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only intercept same-origin requests. External (Unsplash, Descope) goes
  // straight to network — they have their own caching and we don't want to
  // accidentally cache opaque responses forever.
  if (url.origin !== self.location.origin) return;

  // Skip-list: never cache personal/mutating endpoints.
  if (NEVER_CACHE.some((p) => url.pathname.startsWith(p))) return;

  // /uploads/* → CacheFirst (user-uploaded immutable photos).
  if (url.pathname.startsWith("/uploads/")) {
    event.respondWith(cacheFirst(req, RUNTIME_CACHE));
    return;
  }

  // /api/recommendations/co-saves → SWR (stale-while-revalidate).
  if (url.pathname.startsWith("/api/recommendations/co-saves")) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
    return;
  }

  // Other /api/* → NetworkFirst.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }

  // Static assets (_next/static, fonts, public files) → CacheFirst.
  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(css|js|woff2?|svg|png|jpg|jpeg|webp|avif|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req, RUNTIME_CACHE));
    return;
  }

  // Navigations (HTML documents) → NetworkFirst with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(navigationHandler(req));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const resp = await fetch(req);
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch (e) {
    return cached || Response.error();
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(req);
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw e;
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const networked = fetch(req)
    .then((resp) => {
      if (resp.ok) cache.put(req, resp.clone());
      return resp;
    })
    .catch(() => cached);
  return cached || networked;
}

async function navigationHandler(req) {
  try {
    const resp = await fetch(req);
    // Cache successful navigations into the shell cache so later offline
    // visits can hit the same page rather than always falling back.
    if (resp.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(req, resp.clone());
    }
    return resp;
  } catch (e) {
    const shell = await caches.open(SHELL_CACHE);
    const cached = await shell.match(req);
    if (cached) return cached;
    const offline = await caches.open(OFFLINE_CACHE);
    const offlinePage = await offline.match(OFFLINE_URL);
    if (offlinePage) return offlinePage;
    return new Response("You're offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
