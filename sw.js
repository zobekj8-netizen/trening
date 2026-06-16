/* FitDom service worker.
   - Pliki apki (HTML/JS/manifest/ikony): network-first → auto-aktualizacja.
   - Zdjęcia ćwiczeń z CDN: cache-first → działają offline i ładują się od razu. */
const CACHE = "fitdom-cache-v6";
const IMG_CACHE = "fitdom-img-v1";
const ASSETS = [
  "./", "./index.html", "./manifest.json",
  "./icon-180.png", "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE && k !== IMG_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Pliki z innych domen (zdjęcia ćwiczeń z CDN) — cache-first.
  if (url.origin !== location.origin) {
    if (req.destination === "image") {
      e.respondWith((async () => {
        const cache = await caches.open(IMG_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          try { await cache.put(req, res.clone()); } catch (_) {}
          return res;
        } catch (err) {
          return hit || Response.error();
        }
      })());
    }
    return; // inne zasoby zewnętrzne (np. YouTube) — bez ingerencji
  }

  // Zasoby apki — network-first (zawsze najnowsza wersja, offline z cache).
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: "no-store" });
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      return cached || caches.match("./index.html");
    }
  })());
});
