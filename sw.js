const CACHE_NAME = "weekly-planYou-webapp-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./weekly-planYou.css",
  "./weekly-planYou.js",
  "./jszip.min.js",
  "./manifest.json",
  "./sw.js",
  "./version.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("weekly-planYou-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // APIは絶対にキャッシュしない
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  if (url.pathname.endsWith("/version.json") || url.pathname.endsWith("version.json")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request, { cache: "no-cache" });
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone()).catch(() => {});
      }
      return response;
    } catch (_) {
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      throw _;
    }
  })());
});
