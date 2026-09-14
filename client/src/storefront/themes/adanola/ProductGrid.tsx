import { motion } from "framer-motion";
import { ProductCard } from "./ProductCard";
import type { StorefrontProduct } from "@/storefront/components/ProductCard";

type GridProduct = StorefrontProduct & { tags?: string[] | null; hasVariants?: boolean };

export function ProductGrid({ heading, items, slug, formatPrice, viewAllHref, emptyHint, onQuickAdd }: {
  heading: string;
  items: GridProduct[];
  slug: string;
  formatPrice: (n: number) => string;
  viewAllHref?: string;
  emptyHint?: string;
  onQuickAdd?: (item: GridProduct) => void;
}) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8" data-testid={`section-${heading.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground">{heading}</h2>
        {viewAllHref && items.length > 0 && (
          <a href={viewAllHref} className="border border-foreground px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-foreground transition-colors hover:bg-foreground hover:text-background">
            View all
          </a>
        )}
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{emptyHint || "No products yet."}</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.04, ease: "easeOut" }}
            >
              <ProductCard slug={slug} item={item} formatPrice={formatPrice} onQuickAdd={onQuickAdd} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
