// Service Worker for Forest Inventory app.
// Strategy: cache-first for app shell, network-first for everything else.
// Bumping CACHE_VERSION invalidates old caches on next activation.

const CACHE_VERSION = 'forest-inv-v0.6.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/db.js',
  './js/views/projects-list.js',
  './js/views/project-create.js',
  './js/views/project-detail.js',
  './js/views/project-edit.js',
  './js/views/plot-create.js',
  './js/views/plot-detail.js',
  './js/views/plot-edit.js',
  './js/views/tree-create.js',
  './js/compute/plot-metrics.js',
  './js/compute/project-metrics.js',
  './data/forest-types.js',
  './data/species-index.js',
  './data/species-nc-piedmont.js',
  './data/species-southern-appalachian.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests; let everything else pass through.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Same-origin only — never intercept cross-origin requests
  // (e.g. Dexie CDN, future map tiles).
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Cache successful navigations and shell requests opportunistically.
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
