// Compare-at-price → discount-percent / strikethrough-price helper, shared by
// storefront product cards and the product detail page's "-X% OFF" badge.

export interface SaleInfo {
  onSale: boolean;
  discountPercent: number | null;
  formattedCompareAtPrice: string | null;
}

interface SaleableItem {
  price: string | number;
  compareAtPrice?: string | number | null;
}

export function getSaleInfo(item: SaleableItem, formatPrice: (n: number) => string): SaleInfo {
  const price = Number(item.price) || 0;
  const compareAt = item.compareAtPrice != null ? Number(item.compareAtPrice) : null;

  if (!compareAt || compareAt <= price) {
    return { onSale: false, discountPercent: null, formattedCompareAtPrice: null };
  }

  const discountPercent = Math.round((1 - price / compareAt) * 100);
  return {
    onSale: true,
    discountPercent,
    formattedCompareAtPrice: formatPrice(compareAt),
  };
}
