const CACHE_NAME = 'saiyan-steps-v2';
const ASSETS = ['/saiyan-steps/', '/saiyan-steps/index.html', '/saiyan-steps/manifest.json'];
const FONT_CACHE = 'saiyan-fonts-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE_NAME && n !== FONT_CACHE).map(n => caches.delete(n)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(cache => cache.match(e.request).then(cached => cached || fetch(e.request).then(resp => { cache.put(e.request, resp.clone()); return resp; }))));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached => {
    const fetchPromise = fetch(e.request).then(resp => { if (resp.ok) caches.open(CACHE_NAME).then(c => c.put(e.request, resp.clone())); return resp; }).catch(() => cached);
    return cached || fetchPromise;
  }));
});
