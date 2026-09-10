const CACHE_NAME = 'eatout-driver-v2'; // Bumped version
const urlsToCache = [
  '/',
  '/driver/dashboard',
  '/driver/settings',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Cache addAll error:', error);
      })
  );
  self.skipWaiting();
});

// Fetch event - smart caching strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for caching
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          (response) => {
            // Only cache successful GET responses that are basic (same-origin)
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Only cache navigation requests and assets, not API calls
            const url = new URL(event.request.url);
            const isApiRequest = url.pathname.startsWith('/api/');
            
            if (!isApiRequest) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            
            return response;
          }
        );
      })
      .catch(() => {
        // Only provide fallback for navigation requests, let API calls fail naturally
        if (event.request.mode === 'navigate') {
          return caches.match('/driver/dashboard');
        }
        // Let the error propagate for API requests so the app can handle it
        throw new Error('Network request failed and no cache available');
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Background Sync - for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);

  if (event.tag === 'sync-delivery-status') {
    event.waitUntil(syncDeliveryStatus());
  } else if (event.tag === 'sync-location-update') {
    event.waitUntil(syncLocationUpdate());
  } else if (event.tag === 'sync-accept-order') {
    event.waitUntil(syncAcceptOrder());
  }
});

// Sync delivery status updates
async function syncDeliveryStatus() {
  try {
    const syncData = await getFromIndexedDB('pending-status-updates');
    if (!syncData || syncData.length === 0) return;

    for (const update of syncData) {
      const response = await fetch(`/api/driver/orders/${update.orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: update.status }),
      });

      if (response.ok) {
        // Remove from pending queue
        await removeFromIndexedDB('pending-status-updates', update.id);
        console.log('[Background Sync] Status update synced:', update.orderId);
      }
    }
  } catch (error) {
    console.error('[Background Sync] Failed to sync status:', error);
    throw error; // Retry sync
  }
}

// Sync location updates
async function syncLocationUpdate() {
  try {
    const locations = await getFromIndexedDB('pending-location-updates');
    if (!locations || locations.length === 0) return;

    for (const loc of locations) {
      const response = await fetch(`/api/driver/orders/${loc.orderId}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ location: loc.location }),
      });

      if (response.ok) {
        await removeFromIndexedDB('pending-location-updates', loc.id);
        console.log('[Background Sync] Location synced:', loc.orderId);
      }
    }
  } catch (error) {
    console.error('[Background Sync] Failed to sync location:', error);
    throw error;
  }
}

// Sync order acceptance
async function syncAcceptOrder() {
  try {
    const orders = await getFromIndexedDB('pending-order-accepts');
    if (!orders || orders.length === 0) return;

    for (const order of orders) {
      const response = await fetch(`/api/driver/orders/${order.orderId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        await removeFromIndexedDB('pending-order-accepts', order.id);
        console.log('[Background Sync] Order acceptance synced:', order.orderId);
      }
    }
  } catch (error) {
    console.error('[Background Sync] Failed to sync order acceptance:', error);
    throw error;
  }
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  let data = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200], // Vibration pattern
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();

  // Handle action clicks
  if (event.action) {
    if (event.action === 'accept-order') {
      event.waitUntil(
        clients.openWindow(`/driver/dashboard?action=accept&orderId=${event.notification.data.orderId}`)
      );
    } else if (event.action === 'view-order') {
      event.waitUntil(
        clients.openWindow(`/driver/dashboard?orderId=${event.notification.data.orderId}`)
      );
    }
    return;
  }

  // Default action - open app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes('/driver/dashboard') && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/driver/dashboard');
        }
      })
  );
});

// Helper functions for IndexedDB
async function getFromIndexedDB(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('eatout-driver-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        resolve([]);
        return;
      }
      
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function removeFromIndexedDB(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('eatout-driver-db', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}
