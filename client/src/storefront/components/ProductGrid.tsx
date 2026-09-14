import { motion } from "framer-motion";
import { ProductCard, type StorefrontProduct } from "./ProductCard";

export function ProductGrid({ heading, items, slug, formatPrice, viewAllHref, emptyHint }: {
  heading: string;
  items: StorefrontProduct[];
  slug: string;
  formatPrice: (n: number) => string;
  viewAllHref?: string;
  emptyHint?: string;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8" data-testid={`section-${heading.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="mb-12">
        <h2 className="text-center font-serif text-2xl font-normal tracking-tight sm:text-3xl">{heading}</h2>
        {viewAllHref && items.length > 0 && (
          <div className="mt-3 text-center">
            <a href={viewAllHref} className="whitespace-nowrap text-[13px] font-normal underline decoration-1 underline-offset-4 hover:decoration-2">
              View all
            </a>
          </div>
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
