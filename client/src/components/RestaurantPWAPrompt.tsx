import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Bell, X, Smartphone, Share } from "lucide-react";
import { useRestaurantPush } from '@/hooks/useRestaurantPush';

export function RestaurantPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallCard, setShowInstallCard] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  const { 
    isSupported: pushSupported, 
    isSubscribed: pushSubscribed, 
    permission,
    subscribe: subscribeToPush,
    testNotification 
  } = useRestaurantPush();

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);
    
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);
    
    // Check if user dismissed install prompt
    const dismissed = localStorage.getItem('restaurant-pwa-install-dismissed');
    
    // Show install card if not installed and not dismissed
    if (!standalone && !dismissed) {
      setShowInstallCard(true);
    }

    // Handle install prompt (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallCard(true);
    };

    const handleAppInstalled = () => {
      setShowInstallCard(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    setDeferredPrompt(null);
    setShowInstallCard(false);
    
    if (outcome === 'accepted') {
      localStorage.setItem('restaurant-pwa-install-dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setShowInstallCard(false);
    localStorage.setItem('restaurant-pwa-install-dismissed', 'true');
  };

  // Don't show anything if already installed
  if (isStandalone) return null;

  // Don't show if user dismissed and no deferredPrompt available
  if (!showInstallCard) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
      <CardHeader className="relative pb-3">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="h-5 w-5 text-primary" />
          Install EatOut Manager App
        </CardTitle>
        <CardDescription>
          Get the best experience with our Progressive Web App
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {/* Install App Section */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Install on Your Device
            </h4>
            <p className="text-xs text-muted-foreground">
              Access your restaurant dashboard instantly from your home screen, just like Uber Eats Manager
            </p>
            
            {!isIOS && deferredPrompt ? (
              <Button 
                onClick={handleInstallClick} 
                className="w-full"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Install Now
              </Button>
            ) : isIOS ? (
              <Alert className="mt-2">
                <Share className="h-4 w-4" />
                <AlertTitle className="text-sm">Install on iOS</AlertTitle>
                <AlertDescription className="text-xs space-y-1">
                  <p>1. Tap the Share button <Share className="inline h-3 w-3" /> below</p>
                  <p>2. Scroll and tap "Add to Home Screen"</p>
                  <p>3. Tap "Add" to install</p>
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Install option will appear automatically when available
              </p>
            )}
          </div>

          {/* Enable Notifications Section */}
          {pushSupported && !pushSubscribed && (
            <div className="space-y-2 pt-2 border-t">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Enable Order Notifications
              </h4>
              <p className="text-xs text-muted-foreground">
                Get instant alerts when new orders arrive - never miss an order!
              </p>
              <Button 
                onClick={subscribeToPush}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </Button>
            </div>
          )}

          {/* Test Notification (if already subscribed) */}
          {pushSubscribed && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Notifications Active</span>
                </div>
                <Button 
                  onClick={testNotification}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                >
                  Test Alert
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-white/50 dark:bg-black/20 p-3 rounded-lg">
          <div>💡</div>
          <div>
            <strong>Benefits:</strong> Faster access, push notifications, works offline, and uses less data
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
