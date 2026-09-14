import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Star, Minus, Plus } from "lucide-react";
import type { CustomerReview, RestaurantThemeSettings } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { convertAndFormatPrice } from "@/lib/currency";
import { getSaleInfo } from "@/lib/salePricing";
import { storefrontColorVars } from "@/storefront/lib/colorUtils";
import { useCart } from "@/storefront/lib/cartStore";
import { Header } from "@/storefront/components/Header";
import { Footer } from "@/storefront/components/Footer";
import { CartDrawer } from "@/storefront/components/CartDrawer";
import { ProductGrid } from "@/storefront/components/ProductGrid";

interface StorefrontRestaurant {
  name: string;
  currency: string;
  themeSettings: RestaurantThemeSettings | null;
  socialLinks: Record<string, string> | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
}

interface Variant {
  id: string;
  name: string;
  options: Record<string, string> | null;
  priceCents: number;
  imageUrl: string | null;
  stockCount: number | null;
  isActive: boolean;
}

interface ProductDetail {
  id: string;
  name: string;
  handle: string | null;
  description: string | null;
  imageUrl: string | null;
  price: string;
  compareAtPrice: string | null;
  hasVariants: boolean;
  variants: Variant[];
  reviews: CustomerReview[];
  avgRating: number | null;
  reviewCount: number;
  relatedItems: Array<{ id: string; name: string; handle: string | null; imageUrl: string | null; price: string; compareAtPrice: string | null }>;
}

export function StorefrontProduct({ slug, handle }: { slug: string; handle: string }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const cart = useCart(slug);

  const { data: restaurant } = useQuery<StorefrontRestaurant>({ queryKey: [`/api/storefront/${slug}`] });
  const { data: product, isLoading, isError } = useQuery<ProductDetail>({
    queryKey: [`/api/storefront/${slug}/products/${handle}`],
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }
  if (isError || !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <Link href={`/store/${slug}`} className="text-primary hover:underline">Back to store</Link>
      </div>
    );
  }

  const currency = restaurant?.currency || "USD";
  const formatPrice = (n: number) => convertAndFormatPrice(n, currency, null);
  const activeVariants = product.variants.filter((v) => v.isActive);
  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) || null;
  const displayPrice = selectedVariant ? selectedVariant.priceCents / 100 : Number(product.price);
  const sale = getSaleInfo(product, formatPrice);
  const displayImage = selectedVariant?.imageUrl || product.imageUrl;
  const outOfStock = selectedVariant ? (selectedVariant.stockCount ?? 1) <= 0 : false;

  const headerSection = restaurant?.themeSettings?.layout?.sections?.find((s) => s.type === "header");
  const footerSection = restaurant?.themeSettings?.layout?.sections?.find((s) => s.type === "footer");

  const handleAddToCart = () => {
    if (product.hasVariants && !selectedVariant) return;
    cart.addItem({
      menuItemId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      variantName: selectedVariant?.name,
      priceCents: selectedVariant ? selectedVariant.priceCents : Math.round(Number(product.price) * 100),
      imageUrl: displayImage,
    }, qty);
    setCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-background" style={restaurant ? storefrontColorVars(restaurant) : undefined}>
      {headerSection && (
        <Header storeName={restaurant!.name} slug={slug} fields={headerSection.fields as any} cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
      )}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="aspect-square overflow-hidden rounded-lg bg-muted">
            {displayImage ? (
              <img src={displayImage} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">No image</div>
            )}
          </div>
          <div className="space-y-5">
            <div>
              <h1 className="font-display text-3xl font-bold">{product.name}</h1>
              {typeof product.avgRating === "number" && product.reviewCount > 0 && (
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < Math.round(product.avgRating!) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <span>({product.reviewCount})</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold">{formatPrice(displayPrice)}</span>
              {!selectedVariant && sale.formattedCompareAtPrice && (
                <span className="text-base text-muted-foreground line-through">{sale.formattedCompareAtPrice}</span>
              )}
            </div>
            {product.description && <p className="leading-relaxed text-muted-foreground">{product.description}</p>}

            {activeVariants.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Options</p>
                <div className="flex flex-wrap gap-2">
                  {activeVariants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`rounded-md border px-3 py-1.5 text-sm ${selectedVariantId === v.id ? "border-primary bg-primary/10 font-medium" : "border-input hover:bg-accent"}`}
                      data-testid={`button-variant-${v.id}`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button>
              <span className="w-8 text-center">{qty}</span>
              <Button size="icon" variant="outline" onClick={() => setQty((q) => q + 1)}><Plus className="h-4 w-4" /></Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                className="flex-1"
                disabled={outOfStock || (product.hasVariants && !selectedVariant)}
                onClick={handleAddToCart}
                data-testid="button-add-to-cart"
              >
                {outOfStock ? "Out of stock" : "Add to cart"}
              </Button>
            </div>

            {product.reviews.length > 0 && (
              <div className="space-y-4 border-t pt-6">
                <p className="text-sm font-semibold">Customer reviews</p>
                {product.reviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="space-y-1">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">"{r.comment}"</p>}
                    <p className="text-xs font-medium">{r.customerName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {product.relatedItems.length > 0 && (
          <div className="mt-16">
            <ProductGrid heading="You may also like" items={product.relatedItems as any} slug={slug} formatPrice={formatPrice} />
          </div>
        )}
      </main>
      {footerSection && restaurant && (
        <Footer fields={footerSection.fields as any} storeName={restaurant.name} socialLinks={restaurant.socialLinks} />
      )}
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={cart.items}
        formatPrice={formatPrice}
        subtotalCents={cart.subtotalCents}
        onSetQty={cart.setQty}
        onRemove={cart.removeItem}
      />
    </div>
  );
}
