import { motion } from "framer-motion";
import { ProductCard } from "./ProductCard";
import type { StorefrontProduct } from "@/storefront/components/ProductCard";

export function ProductGrid({ heading, items, slug, formatPrice, viewAllHref, emptyHint }: {
  heading: string;
  items: StorefrontProduct[];
  slug: string;
  formatPrice: (n: number) => string;
  viewAllHref?: string;
  emptyHint?: string;
  // Accepted (but unused here) so callers can pass the same props to any
  // theme's ProductGrid — Maison's cards link straight to the PDP, no quick add.
  onQuickAdd?: (item: StorefrontProduct) => void;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" data-testid={`section-${heading.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="mb-10 text-center">
        <h2 className="font-serif text-3xl italic tracking-tight text-foreground sm:text-4xl">{heading}</h2>
        {viewAllHref && items.length > 0 && (
          <a href={viewAllHref} className="mt-3 inline-block text-[13px] font-medium text-primary underline decoration-1 underline-offset-4 hover:decoration-2">
            View all
          </a>
        )}
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{emptyHint || "No products yet."}</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: Math.min(i, 8) * 0.05, ease: "easeOut" }}
            >
              <ProductCard slug={slug} item={item} formatPrice={formatPrice} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
