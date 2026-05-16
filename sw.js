// ============================================================
// G&B Supply ERP — Service Worker v1.0
// Estrategia: Cache First para assets estáticos,
//             Network First para Firebase (datos en tiempo real)
// ============================================================

const CACHE_NAME = 'gb-erp-v1';
const OFFLINE_URL = '/offline.html';

// Assets estáticos que se cachean en la instalación
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ── INSTALL: pre-cachear assets críticos ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpiar caches viejos ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── FETCH: estrategia por tipo de request ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Firebase Firestore y Auth → siempre Network (datos en tiempo real)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com')
  ) {
    // Network only para Firebase
    return;
  }

  // CDN (lucide, recharts, etc.) → Cache First
  if (url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('cdn.')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Assets propios (JS, CSS, imágenes) → Cache First con fallback a Network
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          // Cachear respuestas válidas
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Sin conexión → página offline
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL) || caches.match('/');
          }
        });
      })
    );
  }
});

// ── PUSH NOTIFICATIONS (para futuras alertas de stock bajo) ──
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || 'Nueva notificación G&B ERP',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Abrir ERP' },
      { action: 'dismiss', title: 'Cerrar' }
    ]
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'G&B ERP', options)
  );
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

// ── BACKGROUND SYNC (para movimientos registrados offline) ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-inventory-movements') {
    event.waitUntil(syncPendingMovements());
  }
});

async function syncPendingMovements() {
  // Los movimientos pendientes se guardan en IndexedDB cuando no hay conexión
  // Este handler los envía a Firebase cuando se restaura la conectividad
  console.log('[SW] Syncing pending inventory movements...');
}
