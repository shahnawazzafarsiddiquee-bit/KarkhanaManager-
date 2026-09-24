const CACHE_NAME = "karakhana-v6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/utils.js",
  "./js/store.js",
  "./js/theme.js",
  "./js/pdf.js",
  "./js/karigar.js",
  "./js/vyapari.js",
  "./js/dashboard.js",
  "./js/kharcha.js",
  "./js/report.js",
  "./js/hazri.js",
  "./js/lock.js",
  "./js/settings.js",
  "./js/backup.js",
  "./js/profile.js",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first for our own static files, so a redeploy reaches the browser on
// the next load; the cache is the offline fallback. Cache-first would pin an
// old build until the cache name changed.
// Cross-origin (CDN) requests are left untouched.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET") {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => (await caches.match(event.request)) || Response.error())
  );
});
