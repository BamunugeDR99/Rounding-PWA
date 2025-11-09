// Simple offline-first app shell for GitHub Pages (project site paths are relative)
const CACHE = "rounding-cache-v1";
const APP_SHELL = [
  "index.html",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
      )
  );
  self.clients.claim();
});

// Navigations: network → offline fallback
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("index.html"))
    );
    return;
  }
  // Cache-first for same-origin shell; stale-while-revalidate for cross-origin (CDNs)
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((hit) => hit || fetch(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((resp) => {
          caches.open(CACHE).then((c) => c.put(event.request, resp.clone()));
          return resp;
        });
        return cached || fetchPromise;
      })
    );
  }
});
