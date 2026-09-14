import { useState } from "react";
import { Link } from "wouter";
import { Heart } from "lucide-react";
import { getSaleInfo } from "@/lib/salePricing";
import type { StorefrontProduct } from "@/storefront/components/ProductCard";

type CardProduct = StorefrontProduct & { tags?: string[] | null; hasVariants?: boolean };

export function ProductCard({ slug, item, formatPrice, onQuickAdd }: {
  slug: string;
  item: CardProduct;
  formatPrice: (n: number) => string;
  onQuickAdd?: (item: CardProduct) => void;
}) {
  const [wishlisted, setWishlisted] = useState(false);
  const sale = getSaleInfo(item, formatPrice);
  const href = item.handle ? `/store/${slug}/products/${item.handle}` : `/store/${slug}`;
  const tags = item.tags || [];
  const badge = tags.some((t) => /new/i.test(t)) ? "New" : tags.some((t) => /back.?in.?stock/i.test(t)) ? "Back In Stock" : null;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (item.hasVariants) {
      window.location.href = href;
      return;
    }
    onQuickAdd?.(item);
  };

  return (
    <Link href={href} className="group block" data-testid={`card-product-${item.id}`}>
      <div className="relative aspect-[3/4] overflow-hidden bg-[hsl(var(--muted))]">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No image</div>
        )}
        <button
          onClick={(e) => { e.preventDefault(); setWishlisted((v) => !v); }}
          className="absolute right-2.5 top-2.5 text-foreground"
          aria-label="Add to wishlist"
          data-testid={`button-wishlist-${item.id}`}
        >
          <Heart className="h-4 w-4" strokeWidth={1.5} fill={wishlisted ? "currentColor" : "none"} />
        </button>
        {badge && (
          <span className="absolute bottom-0 left-0 bg-[hsl(var(--muted))] px-2.5 py-1.5 text-xs text-foreground">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-2 space-y-1">
        <p className="line-clamp-2 text-xs text-foreground">{item.name}</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground">{formatPrice(Number(item.price))}</span>
            {sale.formattedCompareAtPrice && (
              <span className="text-[11px] text-muted-foreground line-through">{sale.formattedCompareAtPrice}</span>
            )}
          </div>
          <button
            onClick={handleQuickAdd}
            className="rounded bg-foreground px-2.5 py-1 text-[11px] font-medium text-background transition-opacity hover:opacity-80"
            data-testid={`button-quick-add-${item.id}`}
          >
            Quick Add
          </button>
        </div>
      </div>
    </Link>
  );
}
