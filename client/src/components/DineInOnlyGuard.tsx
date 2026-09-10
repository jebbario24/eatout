import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Restaurant } from "@shared/schema";
import { getBusinessTypeConfig } from "@/lib/businessType";
import { useToast } from "@/hooks/use-toast";

/**
 * Wraps dine-in-only pages (Reservations, Tables) so a non-restaurant
 * merchant landing on the URL directly (bookmark, back button, typed URL)
 * is redirected instead of shown a page that doesn't apply to their
 * business — the sidebar already hides the link for them.
 */
export function DineInOnlyGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: restaurant, isLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants/me"],
  });
  const businessConfig = getBusinessTypeConfig(restaurant?.businessType);

  useEffect(() => {
    if (!isLoading && restaurant && !businessConfig.hasDineIn) {
      toast({
        title: "Not available for this business type",
        description: `This page is for dine-in restaurants. ${businessConfig.business} accounts don't use tables or reservations.`,
      });
      setLocation("/dashboard");
    }
  }, [isLoading, restaurant, businessConfig, setLocation, toast]);

  if (!isLoading && restaurant && !businessConfig.hasDineIn) {
    return null;
  }

  return <>{children}</>;
}
