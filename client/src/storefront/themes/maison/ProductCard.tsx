import { Link } from "wouter";
import { Star } from "lucide-react";
import { getSaleInfo } from "@/lib/salePricing";
import type { StorefrontProduct } from "@/storefront/components/ProductCard";

export function ProductCard({ slug, item, formatPrice }: {
  slug: string;
  item: StorefrontProduct;
  formatPrice: (n: number) => string;
}) {
  const sale = getSaleInfo(item, formatPrice);
  const href = item.handle ? `/store/${slug}/products/${item.handle}` : `/store/${slug}`;
  return (
    <Link href={href} className="group block" data-testid={`card-product-${item.id}`}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No image</div>
        )}
        {sale.onSale && (
          <span className="absolute left-3 top-3 rounded-full bg-background px-3 py-1 text-[11px] font-medium text-primary shadow-sm">
            -{sale.discountPercent}%
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-[14px] font-medium leading-snug text-foreground">{item.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-foreground">{formatPrice(Number(item.price))}</span>
          {sale.formattedCompareAtPrice && (
            <span className="text-xs text-muted-foreground line-through">{sale.formattedCompareAtPrice}</span>
          )}
        </div>
        {typeof item.avgRating === "number" && item.reviewCount ? (
          <div className="flex items-center gap-1 pt-0.5 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{item.avgRating.toFixed(1)}</span>
            <span>({item.reviewCount})</span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
