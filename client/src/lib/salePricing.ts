import type { MenuItem } from "@shared/schema";

export interface SaleInfo {
  formattedCompareAtPrice: string | null;
  discountPercent: number | null;
}

// Real "compare-at" sale pricing only — never fabricated. Returns nulls unless
// the merchant has actually set a compareAtPrice higher than the real price.
export function getSaleInfo(item: MenuItem, formatPrice: (price: number | string) => string): SaleInfo {
  const compareAt = parseFloat((item as any).compareAtPrice || "0");
  const price = parseFloat(item.price);
  if (!compareAt || !(compareAt > price)) {
    return { formattedCompareAtPrice: null, discountPercent: null };
  }
  return {
    formattedCompareAtPrice: formatPrice((item as any).compareAtPrice),
    discountPercent: Math.round((1 - price / compareAt) * 100),
  };
}
