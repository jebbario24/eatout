import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Download, Wifi, WifiOff } from "lucide-react";
import { useRestaurantPush } from "@/hooks/useRestaurantPush";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useState, useEffect } from "react";

export function RestaurantNotificationHeader() {
  const { isSupported, isSubscribed, subscribe, unsubscribe } = useRestaurantPush();
  const { isOnline } = useOnlineStatus();
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstall(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Connection Status */}
      <div className="flex items-center gap-1.5">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-amber-600" />
        )}
      </div>

      {/* Push Notifications */}
      {isSupported && (
        <Button
          variant={isSubscribed ? "outline" : "default"}
          size="sm"
          onClick={() => isSubscribed ? unsubscribe() : subscribe()}
          className="gap-2"
        >
          {isSubscribed ? (
            <>
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts On</span>
            </>
          ) : (
            <>
              <BellOff className="h-4 w-4" />
              <span className="hidden sm:inline">Enable Alerts</span>
            </>
          )}
        </Button>
      )}

      {/* Install App Button */}
      {showInstall && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleInstall}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Install App</span>
        </Button>
      )}

      {/* Notification Status Badge */}
      {isSubscribed && (
        <Badge variant="secondary" className="hidden md:flex gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Live Alerts
        </Badge>
      )}
    </div>
  );
}
