import { useEffect, useState } from 'react';

interface SyncQueueItem {
  id?: number;
  orderId: string;
  status?: string;
  location?: { lat: number; lng: number };
  timestamp: number;
}

export function useBackgroundSync() {
  const [isSyncing, setIsSyncing] = useState(false);

  // Queue an action for background sync
  const queueAction = async (storeName: string, data: Omit<SyncQueueItem, 'id' | 'timestamp'>) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      await new Promise((resolve, reject) => {
        const request = store.add({
          ...data,
          timestamp: Date.now(),
        });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Register background sync
      if ('serviceWorker' in navigator && 'sync' in (navigator as any).serviceWorker) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register(getSyncTag(storeName));
        console.log('[Background Sync] Registered:', storeName);
      } else {
        // Fallback: try to sync immediately
        console.log('[Background Sync] Not supported, syncing immediately');
        await syncNow(storeName);
      }
    } catch (error) {
      console.error('[Background Sync] Failed to queue:', error);
      throw error;
    }
  };

  // Sync immediately (fallback for browsers without background sync)
  const syncNow = async (storeName: string) => {
    setIsSyncing(true);
    try {
      // This will be handled by the service worker or manual fetch
      const syncTag = getSyncTag(storeName);
      console.log('[Background Sync] Manual sync:', syncTag);
      
      // Trigger service worker sync event manually if possible
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register(syncTag);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    queueDeliveryStatusUpdate: (orderId: string, status: string) => 
      queueAction('pending-status-updates', { orderId, status }),
    queueLocationUpdate: (orderId: string, location: { lat: number; lng: number }) => 
      queueAction('pending-location-updates', { orderId, location }),
    queueOrderAcceptance: (orderId: string) => 
      queueAction('pending-order-accepts', { orderId }),
    isSyncing,
  };
}

// Helper functions
function getSyncTag(storeName: string): string {
  const tagMap: Record<string, string> = {
    'pending-status-updates': 'sync-delivery-status',
    'pending-location-updates': 'sync-location-update',
    'pending-order-accepts': 'sync-accept-order',
  };
  return tagMap[storeName] || 'sync-generic';
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('eatout-driver-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('pending-status-updates')) {
        db.createObjectStore('pending-status-updates', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pending-location-updates')) {
        db.createObjectStore('pending-location-updates', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pending-order-accepts')) {
        db.createObjectStore('pending-order-accepts', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}
