/* Offline support: cache the app shell, static assets and visited pages.
   API/Supabase requests are never cached. */
const VERSION = 'quanhaisan-v2-story-npc';
const PRECACHE = ['/', '/assets/harbor-map.webp', '/assets/concept-preview.webp', '/icons/icon-192.png', '/icons/icon-512.png', '/manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin || req.url.includes('/api/')) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(res => { const copy = res.clone(); if(res.ok) caches.open(VERSION).then(c=>c.put(req,copy)); return res; }).catch(() => caches.match(req).then(r=>r||caches.match('/'))));
  } else {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => { if(res.ok) {const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy));} return res;})));
  }
});
