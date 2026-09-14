import { Link } from "wouter";
import { Star } from "lucide-react";
import { getSaleInfo } from "@/lib/salePricing";

export interface StorefrontProduct {
  id: string;
  name: string;
  handle: string | null;
  imageUrl: string | null;
  price: string;
  compareAtPrice?: string | null;
  avgRating?: number | null;
  reviewCount?: number;
}

export function ProductCard({ slug, item, formatPrice }: {
  slug: string;
  item: StorefrontProduct;
  formatPrice: (n: number) => string;
}) {
  const sale = getSaleInfo(item, formatPrice);
  const href = item.handle ? `/store/${slug}/products/${item.handle}` : `/store/${slug}`;
  return (
    <Link href={href} className="group block" data-testid={`card-product-${item.id}`}>
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No image</div>
        )}
        {sale.onSale && (
          <span className="absolute left-3 top-3 bg-background px-2 py-1 text-[11px] font-normal uppercase tracking-wide text-foreground">
            -{sale.discountPercent}%
          </span>
        )}
      </div>
      <div className="mt-3.5 space-y-1">
        <p className="text-[13px] font-normal uppercase leading-snug text-foreground transition-colors group-hover:text-muted-foreground">{item.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-normal text-foreground">
            {formatPrice(Number(item.price))}
          </span>
          {sale.formattedCompareAtPrice && (
            <span className="text-xs text-muted-foreground line-through">{sale.formattedCompareAtPrice}</span>
          )}
        </div>
        {typeof item.avgRating === "number" && item.reviewCount ? (
          <div className="flex items-center gap-1 pt-0.5 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-foreground text-foreground" />
            <span>{item.avgRating.toFixed(1)}</span>
            <span>({item.reviewCount})</span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
