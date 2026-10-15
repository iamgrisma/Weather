// Nepal Hydrology & Meteorology Portal - Service Worker
// Browser Push Notifications & High-Priority River Flood Alerts

const CACHE_NAME = 'nepal-weather-v1';
const PRECACHE_ASSETS = [
  '/',
  '/hydrology',
  '/rainfall',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {
        // Silently continue if some assets fail precache
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Push notification event listener (enables real system notifications even when portal is backgrounded)
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = {
        title: '🚨 Nepal Flood Danger Alert',
        body: event.data.text(),
      };
    }
  }

  const title = payload.title || '🚨 CRITICAL FLOOD DANGER ALERT';
  const options = {
    body: payload.body || 'Budhigandaki River has breached the 7.80m danger threshold. Water level 8.85m and rising.',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    tag: payload.tag || 'flood-danger-river-alert',
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 150, 300, 150, 300],
    data: {
      url: payload.url || '/hydrology',
      riverId: payload.riverId || 120,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'view-hydrology', title: '📊 View River Gauge' },
      { action: 'safety-info', title: '🚨 Safety Actions' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click: focus or open active portal tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/hydrology';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Allow client components to trigger real ServiceWorker notifications directly
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_FLOOD_ALERT') {
    const payload = event.data.payload || {};
    const title = payload.title || '🚨 CRITICAL FLOOD DANGER ALERT: Budhigandaki River';
    const options = {
      body: payload.body || 'Water level 8.85m exceeded 7.80m danger limit (+1.05m). Flow intensifying (+14.8% in 3h). Immediate evacuation notice active for Arughat lowlands.',
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      tag: payload.tag || 'flood-danger-budhigandaki',
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 150, 300, 150, 300],
      data: {
        url: payload.url || '/hydrology',
        riverId: payload.riverId || 120,
        timestamp: Date.now(),
      },
      actions: [
        { action: 'view-hydrology', title: '📊 View River Gauge' },
        { action: 'safety-info', title: '🚨 Safety Actions' },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});
