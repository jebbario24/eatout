import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";

// Consolidated from 3 copy-pasted implementations (StorefrontShell.tsx,
// CustomerAccount.tsx, OrderTracking.tsx). Resolves the storefront slug from the
// route param when present (path-based storefront), falling back to the
// hostname-based lookup for custom-domain storefronts.
export function useResolvedSlug() {
  const params = useParams();
  const paramSlug = (params as any).slug as string | undefined;
  const { data } = useQuery<{ slug: string } | null>({
    queryKey: ["/api/storefront/by-hostname"],
    enabled: !paramSlug,
    queryFn: async () => {
      const r = await fetch("/api/storefront/by-hostname");
      return r.ok ? r.json() : null;
    },
  });
  return paramSlug || data?.slug;
}
