import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

interface SubscriptionStatus {
  hasAccess: boolean;
  status: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  isTrialActive: boolean;
  isSubscriptionActive: boolean;
  manualAccessGranted?: boolean;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Admins don't need subscription checks
  if (user?.role === 'admin') {
    return <>{children}</>;
  }
  
  const { data: subscriptionStatus, isLoading, error } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription-status'],
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
    retry: 3, // Retry failed requests
  });

  useEffect(() => {
    // Don't redirect if we're already on the subscribe page or still loading
    if (isLoading || location === '/subscribe') {
      return;
    }

    // Redirect to subscribe page if access is denied
    if (subscriptionStatus && !subscriptionStatus.hasAccess) {
      setLocation('/subscribe');
    }

    // If error occurs, redirect to subscribe page as fallback
    if (error) {
      setLocation('/subscribe');
    }
  }, [subscriptionStatus, isLoading, error, location, setLocation]);

  // Show loading state while checking subscription
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show error state if subscription check failed
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="mt-2">
            <p className="mb-4">Unable to verify subscription status. Please try again.</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/subscribe'}
              data-testid="button-goto-subscribe"
            >
              Go to Subscription Page
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If no access and not on subscribe page, show nothing (will redirect)
  if (!subscriptionStatus?.hasAccess && location !== '/subscribe') {
    return null;
  }

  return <>{children}</>;
}
