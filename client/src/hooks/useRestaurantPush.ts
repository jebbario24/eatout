import { useState, useEffect } from 'react';

export function useRestaurantPush() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if push notifications are supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setIsSubscribed(true);
        setSubscription(existingSubscription);
      }
    } catch (error) {
      console.error('Error checking push subscription:', error);
    }
  };

  const subscribe = async () => {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from server
      const response = await fetch('/api/restaurant/push/vapid-public-key', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to get VAPID public key');
      }
      
      const { publicKey } = await response.json();

      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      await fetch('/api/restaurant/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(pushSubscription.toJSON()),
      });

      setIsSubscribed(true);
      setSubscription(pushSubscription);
      
      // Test notification
      new Notification('🎉 Notifications Enabled!', {
        body: 'You\'ll now receive alerts for new orders',
        icon: '/icons/restaurant-icon-192.png',
        badge: '/icons/restaurant-icon-192.png',
      });
      
      return pushSubscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      throw error;
    }
  };

  const unsubscribe = async () => {
    try {
      if (!subscription) return;

      await subscription.unsubscribe();
      
      // Notify server
      await fetch('/api/restaurant/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(subscription.toJSON()),
      });

      setIsSubscribed(false);
      setSubscription(null);
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      throw error;
    }
  };

  const testNotification = () => {
    if (permission !== 'granted') {
      alert('Please enable notifications first');
      return;
    }

    new Notification('🔔 Test Notification', {
      body: 'This is how order notifications will look',
      icon: '/icons/restaurant-icon-192.png',
      badge: '/icons/restaurant-icon-192.png',
      tag: 'test',
      ...({ vibrate: [200, 100, 200] } as any),
    });
  };

  return {
    isSupported,
    isSubscribed,
    subscription,
    permission,
    subscribe,
    unsubscribe,
    testNotification,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
