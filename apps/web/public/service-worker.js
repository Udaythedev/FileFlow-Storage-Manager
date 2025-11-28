/**
 * Service Worker for FileFlow
 * Provides offline support, caching strategies, and background sync
 */

const CACHE_NAME = 'fileflow-cache-v1';
const RUNTIME_CACHE = 'fileflow-runtime-v1';
const STALE_WHILE_REVALIDATE_CACHE = 'fileflow-swr-v1';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

/**
 * Install event: cache critical assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching critical assets');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        // Not all assets may be available during development, continue anyway
        console.warn('[SW] Some assets failed to cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

/**
 * Activate event: clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE && cacheName !== STALE_WHILE_REVALIDATE_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Fetch event: implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip certain paths (e.g., API calls that should not be cached)
  if (request.method !== 'GET') {
    return;
  }

  // Strategy 1: Cache-first for static assets
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          console.log('[SW] Cache hit:', url.pathname);
          return response;
        }
        return fetch(request).then((response) => {
          // Only cache successful responses
          if (response && response.status === 200) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        }).catch((err) => {
          console.warn('[SW] Fetch failed:', url.pathname, err);
          // Return offline fallback if available
          return caches.match('/index.html');
        });
      })
    );
    return;
  }

  // Strategy 2: Stale-while-revalidate for HTML/JS
  if (isHtmlOrJs(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        }).catch((err) => {
          console.warn('[SW] Fetch failed:', url.pathname, err);
          return cachedResponse || caches.match('/index.html');
        });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network-first with fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const cache = caches.open(RUNTIME_CACHE);
          cache.then((c) => c.put(request, response.clone()));
        }
        return response;
      })
      .catch((err) => {
        console.warn('[SW] Network request failed:', url.pathname, err);
        return caches.match(request)
          .then((response) => response || caches.match('/index.html'));
      })
  );
});

/**
 * Check if URL is a static asset (CSS, images, fonts, JS bundles)
 */
function isStaticAsset(url) {
  const pathname = url.pathname;
  return /\.(css|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot|js)$/.test(pathname);
}

/**
 * Check if URL is HTML or main JS
 */
function isHtmlOrJs(url) {
  const pathname = url.pathname;
  return pathname.endsWith('.html') || pathname.endsWith('.js') || pathname === '/';
}

/**
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    });
  }
});
