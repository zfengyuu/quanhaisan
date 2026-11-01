/* Offline support: cache the app shell, static assets and visited pages.
   API/Supabase requests are never cached. */
const VERSION = 'quanhaisan-v4-dynamic-courtyard';
const PRECACHE = ['/', '/assets/harbor-courtyard.webp?v=4', '/assets/concept-preview.webp', '/icons/icon-192.png', '/icons/icon-512.png', '/assets/pixel/story/chapter-1.png', '/assets/pixel/seafood/ca-thu.png', '/manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (
    req.method !== 'GET' ||
    new URL(req.url).origin !== self.location.origin ||
    req.url.includes('/api/') ||
    req.url.includes('/_next/webpack') ||
    req.url.includes('hot-update')
  ) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(res => { const copy = res.clone(); if(res.ok) caches.open(VERSION).then(c=>c.put(req,copy)); return res; }).catch(() => caches.match(req).then(r=>r||caches.match('/'))));
  } else {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => { if(res.ok) {const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy));} return res;})));
  }
});
