// Bump this version string on every meaningful deploy. The activate handler
// deletes any cache whose name doesn't match CACHE — but that only works if
// CACHE actually changes. Leaving it static (e.g. always 'pillarpos-v1')
// means old cached app-shell content from BEFORE a bugfix can silently
// linger forever and get served again the next time a network request
// hiccups, making a fixed bug look like it "came back."
const CACHE = 'pillarpos-v2-2026-07-14';
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/index.html'])));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Only manage the app shell (same-origin: this Vercel deployment).
  // Cross-origin calls (Supabase REST API, etc.) must NOT be intercepted
  // here — they already have their own timeout/abort handling in the app
  // code, and routing them through this cache-fallback logic adds an extra,
  // harder-to-debug layer that can make live API calls behave like stale
  // cached data during network hiccups.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
