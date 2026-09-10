import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Restaurant } from "@shared/schema";

interface RestaurantSetupGuardProps {
  children: React.ReactNode;
}

export function RestaurantSetupGuard({ children }: RestaurantSetupGuardProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Only check for restaurant owners (not admins or drivers)
  if (user?.role !== 'owner') {
    return <>{children}</>;
  }
  
  const { data: restaurant, isLoading } = useQuery<Restaurant | null>({
    queryKey: ['/api/restaurants/me'],
    retry: 1,
  });

  // Define allowed paths where users can go even without a restaurant
  const allowedPaths = ['/settings', '/billing', '/subscribe'];
  const isOnAllowedPath = allowedPaths.includes(location);

  useEffect(() => {
    // Don't redirect if still loading or already on an allowed path
    if (isLoading || isOnAllowedPath) {
      return;
    }

    // Redirect to settings if no restaurant exists
    // This will run every time user tries to access a restricted page without a restaurant
    if (!restaurant) {
      setLocation('/settings');
    }
  }, [restaurant, isLoading, isOnAllowedPath, location, setLocation]);

  // Show loading state while checking
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If on an allowed path, render normally (even without restaurant)
  // The Settings page itself will show the onboarding message
  return <>{children}</>;
}
