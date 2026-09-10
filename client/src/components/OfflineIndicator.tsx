import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus();

  if (isOnline && !wasOffline) {
    return null; // Normal online state, no need to show anything
  }

  if (!isOnline) {
    return (
      <Alert className="mb-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30">
        <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-900 dark:text-amber-100">
          <strong>You're offline.</strong> Some features may be limited. Your actions will sync when you're back online.
        </AlertDescription>
      </Alert>
    );
  }

  if (wasOffline) {
    return (
      <Alert className="mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30">
        <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-900 dark:text-green-100">
          <strong>Back online!</strong> Syncing your pending actions...
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
