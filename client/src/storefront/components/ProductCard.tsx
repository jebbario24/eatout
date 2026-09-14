import { Link } from "wouter";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">No image</div>
        )}
        {sale.onSale && (
          <Badge className="absolute left-2 top-2 bg-[hsl(0,84%,46%)] text-white border-transparent">
            -{sale.discountPercent}% OFF
          </Badge>
        )}
      </div>
      <div className="mt-2.5 space-y-1">
        <p className="text-sm font-medium truncate">{item.name}</p>
        {typeof item.avgRating === "number" && item.reviewCount ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{item.avgRating.toFixed(1)}</span>
            <span>({item.reviewCount})</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <span className={sale.onSale ? "text-sm font-semibold text-[hsl(0,84%,46%)]" : "text-sm font-semibold"}>
            {formatPrice(Number(item.price))}
          </span>
          {sale.formattedCompareAtPrice && (
            <span className="text-xs text-muted-foreground line-through">{sale.formattedCompareAtPrice}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
