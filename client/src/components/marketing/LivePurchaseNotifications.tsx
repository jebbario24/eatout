import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, User } from "lucide-react";

interface PurchaseNotification {
  id: string;
  customerName: string;
  itemName: string;
  timeAgo: string;
}

interface LivePurchaseNotificationsProps {
  enabled: boolean;
  restaurantId?: string;
}

export function LivePurchaseNotifications({ enabled, restaurantId }: LivePurchaseNotificationsProps) {
  const [notifications, setNotifications] = useState<PurchaseNotification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<PurchaseNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled || !restaurantId) return;

    const fetchRecentOrders = async () => {
      try {
        const response = await fetch(`/api/storefront/recent-purchases/${restaurantId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('[LivePurchaseNotifications] Fetched notifications:', data);
          setNotifications(data);
        } else {
          console.log('[LivePurchaseNotifications] Response not OK:', response.status);
        }
      } catch (error) {
        console.error("Failed to fetch recent purchases:", error);
      }
    };

    fetchRecentOrders();
    const interval = setInterval(fetchRecentOrders, 30000);

    return () => clearInterval(interval);
  }, [enabled, restaurantId]);

  useEffect(() => {
    if (notifications.length === 0 || !enabled) {
      console.log('[LivePurchaseNotifications] Not showing - notifications:', notifications.length, 'enabled:', enabled);
      return;
    }

    let hideTimeout: NodeJS.Timeout | null = null;

    const showNotification = () => {
      const randomNotification = notifications[Math.floor(Math.random() * notifications.length)];
      console.log('[LivePurchaseNotifications] Showing notification:', randomNotification);
      setCurrentNotification(randomNotification);
      setIsVisible(true);

      hideTimeout = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    };

    showNotification();
    const interval = setInterval(showNotification, 15000);

    return () => {
      clearInterval(interval);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [notifications, enabled]);

  if (!enabled || !isVisible || !currentNotification) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500"
      data-testid="live-purchase-notification"
    >
      <Badge 
        variant="secondary" 
        className="px-4 py-3 text-sm shadow-lg border bg-background/95 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
            <ShoppingCart className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{currentNotification.customerName}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              ordered {currentNotification.itemName} • {currentNotification.timeAgo}
            </span>
          </div>
        </div>
      </Badge>
    </div>
  );
}
