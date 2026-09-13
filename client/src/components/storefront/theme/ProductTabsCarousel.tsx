import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuItemCard } from "@/components/storefront/MenuItemCard";
import { getSaleInfo } from "@/lib/salePricing";
import type { MenuItem } from "@shared/schema";

interface ProductTabsCarouselProps {
  items: MenuItem[];
  formatPrice: (price: number | string) => string;
  onSelect: (item: MenuItem) => void;
  onAddToCart: (item: MenuItem) => void;
}

// Tabbed "Best Sellers / New Arrivals" carousel — reuses the existing tag system
// (item.tags) for Best Sellers, falls back to newest-by-createdAt for New Arrivals
// when nothing is explicitly tagged "New". No new data, no new queries.
export function ProductTabsCarousel({ items, formatPrice, onSelect, onAddToCart }: ProductTabsCarouselProps) {
  const [tab, setTab] = useState<"bestsellers" | "new">("bestsellers");

  const bestSellers = useMemo(
    () => items.filter((i) => i.tags?.some((tag) => tag === "Bestseller" || tag === "Popular")).slice(0, 8),
    [items]
  );
  const newArrivals = useMemo(() => {
    const tagged = items.filter((i) => i.tags?.includes("New"));
    if (tagged.length > 0) return tagged.slice(0, 8);
    return [...items]
      .filter((i) => i.createdAt)
      .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
      .slice(0, 8);
  }, [items]);

  const active = tab === "bestsellers" ? bestSellers : newArrivals;
  if (bestSellers.length === 0 && newArrivals.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "bestsellers" | "new")}>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h2 className="text-xl md:text-2xl font-display font-bold">Discover</h2>
          <TabsList>
            <TabsTrigger value="bestsellers" data-testid="tab-best-sellers">Best Sellers</TabsTrigger>
            <TabsTrigger value="new" data-testid="tab-new-arrivals">New Arrivals</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.25 }}
          className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1"
        >
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">Nothing here yet.</p>
          ) : (
            active.map((item) => (
              <div key={item.id} className="w-48 md:w-56 shrink-0">
                <MenuItemCard
                  item={item}
                  displayName={item.name}
                  displayDescription={item.description}
                  cardStyle="bordered"
                  theme="wellness"
                  formattedPrice={formatPrice(item.price)}
                  {...getSaleInfo(item, formatPrice)}
                  isBoosted={false}
                  scarcity={null}
                  socialProof={null}
                  onSelect={() => item.isAvailable && onSelect(item)}
                  onAddToCart={(e) => {
                    e.stopPropagation();
                    onAddToCart(item);
                  }}
                />
              </div>
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
