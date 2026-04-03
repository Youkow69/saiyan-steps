/* ═══════════════════════════════════════════════════════════════════════════
   Saiyan Tracker — Service Worker v3
   Stale-while-revalidate strategy + font caching + old cache cleanup
   ═══════════════════════════════════════════════════════════════════════════ */

var CACHE_NAME = 'saiyan-steps-v3';
var FONT_CACHE = 'saiyan-fonts-v1';

var ASSETS = [
  '/saiyan-steps/',
  '/saiyan-steps/index.html',
  '/saiyan-steps/css/style.css',
  '/saiyan-steps/js/app.js',
  '/saiyan-steps/manifest.json'
];

// ── Install: precache core assets ──
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names
          .filter(function(n) { return n !== CACHE_NAME && n !== FONT_CACHE; })
          .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: stale-while-revalidate for app, cache-first for fonts ──
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Font requests: cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(resp) {
            if (resp.ok) cache.put(e.request, resp.clone());
            return resp;
          });
        });
      })
    );
    return;
  }

  // App requests: stale-while-revalidate
  e.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(e.request).then(function(cached) {
        var fetchPromise = fetch(e.request).then(function(resp) {
          if (resp.ok) {
            cache.put(e.request, resp.clone());
          }
          return resp;
        }).catch(function() {
          return cached;
        });

        // Return cached immediately, update in background
        return cached || fetchPromise;
      });
    })
  );
});


// FEAT-S13: Push notification handler
self.addEventListener('push', function(event) {
  var data = { title: 'Saiyan Tracker', body: 'Nouvelle notification', icon: '/icons/icon-192.png' };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [200, 100, 200],
      data: data
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url && 'focus' in clientList[i]) return clientList[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
