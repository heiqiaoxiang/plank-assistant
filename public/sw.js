const CACHE_NAME = 'plank-v1';

// On install: cache the shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/', '/index.html'])
    )
  );
});

// On activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML, stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const isHTML = request.headers.get('Accept')?.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
  } else {
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        });
        return cached || network;
      })
    );
  }
});
