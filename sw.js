// sw.js — Service worker basique pour RMS EcoSky
// Met en cache les pages principales pour un chargement plus rapide et un
// fonctionnement minimal hors-ligne. Reste volontairement simple : pas de
// stratégie de cache complexe, juste "cache puis réseau" sur les pages du
// site vitrine.

const CACHE_NAME = "ecosky-cache-v1";
const PRECACHE_URLS = [
  "/index.html",
  "/services.html",
  "/realisations.html",
  "/contact.html",
  "/styles.css",
  "/script.js",
  "/images/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // On ne met en cache que les requêtes GET vers notre propre domaine —
  // on laisse passer directement tout ce qui va vers salesflow-ecosky.vercel.app
  // (API, formulaires) ou vers Supabase, pour ne jamais servir de données
  // périmées sur un devis ou un lead.
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  if (event.request.method !== "GET" || !isSameOrigin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
