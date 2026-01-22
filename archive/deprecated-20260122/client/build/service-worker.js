const CACHE_NAME = 'magazyn-static-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/logo192.png',
  '/logo512.png',
  '/MagazynLogo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Simple fetch strategy:
// - API requests: network-first with cache fallback
// - Navigation and static assets: cache-first with network fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Network-first for API calls
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') ) {
    // For API requests, fetch with an opt-out header so the server can
    // avoid noisy tracing for service-worker-initiated requests.
    // Create a clone of the request with the extra header.
    const modifiedHeaders = new Headers(request.headers);
    modifiedHeaders.set('x-no-api-trace', '1');
    const modifiedReq = new Request(request, { headers: modifiedHeaders });
    event.respondWith(
      fetch(modifiedReq)
        .then((response) => {
          // Optionally cache API responses if needed
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || new Response('Service unavailable', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  // Network-first for uploaded images to avoid serving stale cached thumbnails
  // (uploads are frequently replaced/updated). Use network and fall back to cache.
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      fetch(request).then((response) => {
        // update cache asynchronously for faster subsequent loads
        try {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
        } catch (e) {
          // ignore cache write errors
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(request);
        return cached || new Response('Service unavailable', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      })
    );
    return;
  }

  // For same-origin assets and navigation: try cache first
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;
        try {
          return await fetch(request);
        } catch (e) {
          const navFallback = await caches.match('/index.html');
          return navFallback || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }
      })
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      return cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    })
  );
});
