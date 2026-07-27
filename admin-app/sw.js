// Minimal app-shell cache for installability + a faster repeat load.
// Deliberately narrow: only the static shell files below ever get
// cached. Everything else — every /admin/*, /auth/*, /public/* call,
// and critically /api/config (which must always reflect the live
// CLOUD_API_BASE env var, never a cached copy) — passes straight
// through to the network, untouched.
const CACHE_NAME = 'pos-admin-shell-v1';
const SHELL_FILES = ['/', '/app.js', '/styles.css', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isShellFile = event.request.method === 'GET' && url.origin === self.location.origin && SHELL_FILES.includes(url.pathname);
  if (!isShellFile) return; // let the browser handle everything else normally

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const fresh = await fetch(event.request);
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(event.request);
        return cached || Response.error();
      }
    })
  );
});
