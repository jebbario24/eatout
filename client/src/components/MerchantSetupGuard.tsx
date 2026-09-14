import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Merchant } from "@shared/schema";

interface MerchantSetupGuardProps {
  children: React.ReactNode;
}

export function MerchantSetupGuard({ children }: MerchantSetupGuardProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Only check for merchant owners (not admins or drivers)
  if (user?.role !== 'owner') {
    return <>{children}</>;
  }
  
  const { data: merchant, isLoading } = useQuery<Merchant | null>({
    queryKey: ['/api/merchants/me'],
    retry: 1,
  });

  // Define allowed paths where users can go even without a merchant
  const allowedPaths = ['/settings', '/billing', '/subscribe'];
  const isOnAllowedPath = allowedPaths.includes(location);

  useEffect(() => {
    // Don't redirect if still loading or already on an allowed path
    if (isLoading || isOnAllowedPath) {
      return;
    }

    // Redirect to settings if no merchant exists
    // This will run every time user tries to access a restricted page without a merchant
    if (!merchant) {
      setLocation('/settings');
    }
  }, [merchant, isLoading, isOnAllowedPath, location, setLocation]);

  // Show loading state while checking
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If on an allowed path, render normally (even without merchant)
  // The Settings page itself will show the onboarding message
  return <>{children}</>;
}
