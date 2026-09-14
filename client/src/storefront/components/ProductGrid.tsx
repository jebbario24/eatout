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
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" data-testid={`section-${heading.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">{heading}</h2>
        {viewAllHref && items.length > 0 && (
          <a href={viewAllHref} className="text-sm font-medium text-primary hover:underline">View all →</a>
        )}
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{emptyHint || "No products yet."}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ProductCard key={item.id} slug={slug} item={item} formatPrice={formatPrice} />
          ))}
        </div>
      )}
    </div>
  );
}
