/* FitDom service worker — strategia "najpierw sieć" (network-first).
   Dzięki temu apka po dodaniu na ekran główny aktualizuje się sama przy
   każdym otwarciu z internetem, a bez internetu działa z ostatniej kopii. */
const CACHE = "fitdom-cache-v1";
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
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Pliki z innych domen (zdjęcia ćwiczeń z CDN, YouTube) — bez ingerencji.
  if (url.origin !== location.origin) return;
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
