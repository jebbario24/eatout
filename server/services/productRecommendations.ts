import type { MenuItem } from "@shared/schema";

// Product-detail-page "related items" today are 100% manually curated
// (crossSellItemIds/upsellItemIds) with no fallback. This backfills a
// deterministic similarity score (same category, price-proximity, shared
// tags) when a product has fewer than `minCount` manually-curated related
// items, so every product page has useful related items from day one.
export function backfillRelatedItems(
  current: MenuItem,
  manuallyRelatedIds: string[],
  allItems: MenuItem[],
  minCount = 4,
): MenuItem[] {
  const manual = allItems.filter((i) => manuallyRelatedIds.includes(i.id) && i.isAvailable && i.visibleOnline);
  if (manual.length >= minCount) return manual;

  const excludeIds = new Set([current.id, ...manual.map((i) => i.id)]);
  const currentPrice = Number(current.priceCents || 0);
  const currentTags = new Set((current.tags || []).map((t) => t.toLowerCase()));

  const candidates = allItems.filter((i) => i.isAvailable && i.visibleOnline && !excludeIds.has(i.id));

  const scored = candidates.map((i) => {
    let score = 0;
    if (i.categoryId === current.categoryId) score += 3;
    const price = Number(i.priceCents || 0);
    if (currentPrice > 0 && price > 0) {
      const ratio = price / currentPrice;
      if (ratio >= 0.6 && ratio <= 1.4) score += 2;
      else if (ratio >= 0.4 && ratio <= 2.0) score += 1;
    }
    const sharedTags = (i.tags || []).filter((t) => currentTags.has(t.toLowerCase())).length;
    score += Math.min(sharedTags, 2);
    return { item: i, score };
  });

  const backfill = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, minCount - manual.length)
    .map((s) => s.item);

  return [...manual, ...backfill];
}
