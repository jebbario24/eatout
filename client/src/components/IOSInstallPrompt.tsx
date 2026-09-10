import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Share, X } from "lucide-react";

export function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Check if user dismissed the prompt before
    const dismissed = localStorage.getItem('ios-install-prompt-dismissed');
    
    // Show prompt only on iOS, not installed, and not previously dismissed
    if (isIOS && !isStandalone && !dismissed) {
      // Wait 3 seconds before showing to not overwhelm user
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ios-install-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <Alert className="mb-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <Share className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">Install EatOut Driver App</AlertTitle>
      <AlertDescription className="text-blue-800 dark:text-blue-200 space-y-2">
        <p>Add this app to your home screen for the best experience:</p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Tap the Share button <Share className="inline h-3 w-3" /> at the bottom of your screen</li>
          <li>Scroll down and tap "Add to Home Screen"</li>
          <li>Tap "Add" in the top right corner</li>
        </ol>
        <p className="text-xs mt-2">Works offline and gets notifications like a native app!</p>
      </AlertDescription>
    </Alert>
  );
}
