import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { convertAndFormatPrice, type DisplayMarket } from "@/lib/currency";

// Same market-selection + price-formatting logic Storefront.tsx already has
// (display-currency conversion only — checkout always totals in the restaurant's
// base currency). Extracted so the product and shop pages don't each reimplement it.
export function useStorefrontMarket(slug: string | undefined, baseCurrency: string | undefined) {
  const marketsQ = useQuery<DisplayMarket[]>({
    queryKey: [`/api/storefront/${slug}/markets`],
    enabled: !!slug,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}/markets`);
      return r.ok ? r.json() : [];
    },
  });
  const markets = marketsQ.data || [];
  const [selectedMarketName, setSelectedMarketName] = useState<string | null>(null);
  useEffect(() => {
    if (!slug) return;
    try {
      setSelectedMarketName(localStorage.getItem(`eatout_market_${slug}`));
    } catch {}
  }, [slug]);
  const selectedMarket = markets.find((m: any) => m.name === selectedMarketName) || null;
  const handleSelectMarket = (name: string) => {
    setSelectedMarketName(name === "__default__" ? null : name);
    try {
      if (name === "__default__") {
        localStorage.removeItem(`eatout_market_${slug}`);
      } else {
        localStorage.setItem(`eatout_market_${slug}`, name);
      }
    } catch {}
  };
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return convertAndFormatPrice(numPrice, baseCurrency || 'USD', selectedMarket);
  };

  return { markets, selectedMarketName, handleSelectMarket, formatPrice };
}
