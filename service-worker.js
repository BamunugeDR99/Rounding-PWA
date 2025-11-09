// Simple service worker: app shell cache, offline first for navigations.
const CACHE_NAME = "rounding-cache-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))
        )
      )
  );
  self.clients.claim();
});

// Network falling back to cache for cross-origin (like Tailwind/GFonts), cache-first for same-origin shell
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches
        .match(event.request)
        .then((cached) => cached || fetch(event.request))
    );
  } else {
    // Stale-while-revalidate for CDN assets
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((resp) => {
          const respClone = resp.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, respClone));
          return resp;
        });
        return cached || fetchPromise;
      })
    );
  }
});
