// ══════════════════════════════════════════════════════════════════════════════
// SERVICE WORKER - Mi Tienda Nexum PWA v2
// Estrategia: Network-first para HTML (siempre busca lo m\u00e1s nuevo)
//             Cache-first para im\u00e1genes e iconos (m\u00e1s r\u00e1pido)
// ══════════════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'nexum-v2-2026-04-21';
const ARCHIVOS_A_CACHEAR = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', function(event) {
  console.log('[SW v2] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ARCHIVOS_A_CACHEAR);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  console.log('[SW v2] Activando y limpiando caches viejos...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW v2] Borrando cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  var url = event.request.url;
  if (url.indexOf('googleapis.com') !== -1 ||
      url.indexOf('accounts.google.com') !== -1 ||
      url.indexOf('chrome-extension') !== -1) {
    return;
  }

  // HTML / navegacion: NETWORK-FIRST (siempre lo mas nuevo)
  if (event.request.mode === 'navigate' ||
      url.endsWith('.html') ||
      url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(function(networkResponse) {
          var responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(function() {
          return caches.match(event.request).then(function(cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Imagenes/iconos: CACHE-FIRST (mas rapido)
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200 &&
            networkResponse.type === 'basic') {
          var responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
