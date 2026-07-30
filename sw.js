/* Ceylon Limerance — service worker.
   Caches the app shell so it opens instantly and survives a dead signal.
   Data always comes from the network; it is never cached, because a stale
   tick list is worse than no tick list. */
var VERSION = 'cl-v4-1';
var SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === VERSION ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // API posts go straight out
  if (req.url.indexOf('script.google.com') > -1) return;  // never cache the API
  if (req.url.indexOf('fonts.googleapis') > -1 || req.url.indexOf('fonts.gstatic') > -1) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
          return res;
        });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) {
        fetch(req).then(function (res) {                  // refresh quietly in the background
          if (res && res.status === 200) {
            caches.open(VERSION).then(function (c) { c.put(req, res); });
          }
        }).catch(function () {});
        return hit;
      }
      return fetch(req).catch(function () { return caches.match('./index.html'); });
    })
  );
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './index.html';
  e.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
