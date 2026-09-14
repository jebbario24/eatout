import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Star, Minus, Plus, Heart, Truck, RefreshCw } from "lucide-react";
import type { CustomerReview, RestaurantThemeSettings } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { convertAndFormatPrice } from "@/lib/currency";
import { getSaleInfo } from "@/lib/salePricing";
import { storefrontColorVars } from "@/storefront/lib/colorUtils";
import { useCart } from "@/storefront/lib/cartStore";
import { STOREFRONT_THEMES, resolveTheme } from "@/storefront/themeRegistry";
import { CartDrawer } from "@/storefront/components/CartDrawer";
import { PixelScripts, trackViewContent, trackAddToCart } from "@/components/PixelScripts";

interface StorefrontRestaurant {
  id: string;
  name: string;
  currency: string;
  themeSettings: RestaurantThemeSettings | null;
  socialLinks: Record<string, string> | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  metaPixelId?: string | null;
  tiktokPixelId?: string | null;
  googleAnalyticsId?: string | null;
  googleAdsId?: string | null;
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

const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";

export function StorefrontProduct({ slug, handle }: { slug: string; handle: string }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [draft, setDraft] = useState<{ themeSettings?: RestaurantThemeSettings } | null>(null);
  const cart = useCart(slug);

  const { data: restaurant } = useQuery<StorefrontRestaurant>({ queryKey: [`/api/storefront/${slug}`] });
  const { data: product, isLoading, isError } = useQuery<ProductDetail>({
    queryKey: [`/api/storefront/${slug}/products/${handle}`],
  });

  useEffect(() => {
    if (product) setActiveImage(product.imageUrl);
    setSelectedVariantId(null);
    setQty(1);
  }, [product?.id]);

  useEffect(() => {
    if (!isPreview) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "STOREFRONT_DRAFT_UPDATE") {
        setDraft({ themeSettings: event.data.themeSettings });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Never fire real tracking pixels from inside the Store Editor's live
  // preview iframe — that would pollute the merchant's own ad accounts.
  useEffect(() => {
    if (isPreview || !product || !restaurant) return;
    trackViewContent(
      { id: product.id, name: product.name, price: Number(product.price), currency: restaurant.currency || "USD" },
      {
        metaPixelId: restaurant.metaPixelId || undefined,
        tiktokPixelId: restaurant.tiktokPixelId || undefined,
        googleAnalyticsId: restaurant.googleAnalyticsId || undefined,
        googleAdsId: restaurant.googleAdsId || undefined,
      }
    );
  }, [product?.id, restaurant?.id]);

  const themeSettings = draft?.themeSettings || restaurant?.themeSettings;
  const theme = resolveTheme(themeSettings?.theme);
  const T = STOREFRONT_THEMES[theme];

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
  const outOfStock = selectedVariant ? (selectedVariant.stockCount ?? 1) <= 0 : false;

  const gallery = Array.from(new Set([product.imageUrl, ...activeVariants.map((v) => v.imageUrl)].filter(Boolean))) as string[];
  const displayImage = activeImage || product.imageUrl;

  const headerSection = themeSettings?.layout?.sections?.find((s) => s.type === "header");
  const footerSection = themeSettings?.layout?.sections?.find((s) => s.type === "footer");
  const trustBadgesSection = themeSettings?.layout?.sections?.find((s) => s.type === "trustBadges" && s.enabled);
  const newsletterSection = themeSettings?.layout?.sections?.find((s) => s.type === "newsletter" && s.enabled);
  const aboutUsSection = themeSettings?.layout?.sections?.find((s) => s.type === "aboutUs" && s.enabled);
  const trustBadgeItems: Array<{ icon: string; label: string; detail: string }> = trustBadgesSection?.fields?.items || [];
  const shippingBadge = trustBadgeItems.find((i) => i.icon === "truck");
  const returnsBadge = trustBadgeItems.find((i) => i.icon === "refresh-cw");
  const productPageSettings = themeSettings?.productPage || {};
  const relatedHeading = productPageSettings.relatedHeading || "You may also like";
  const shippingReturnsText = productPageSettings.shippingReturnsText?.trim();
  const showAboutUs = !!productPageSettings.showAboutUs && !!aboutUsSection;
  const addToCartText = productPageSettings.addToCartText?.trim() || "Add to cart";
  const detailsHeading = productPageSettings.detailsHeading?.trim() || "Details";
  const showBuyNow = productPageSettings.showBuyNow !== false;
  const showWishlist = productPageSettings.showWishlist !== false;

  const selectVariant = (v: Variant) => {
    setSelectedVariantId(v.id);
    if (v.imageUrl) setActiveImage(v.imageUrl);
  };

  const handleAddToCart = () => {
    if (product.hasVariants && !selectedVariant) return;
    const priceCents = selectedVariant ? selectedVariant.priceCents : Math.round(Number(product.price) * 100);
    cart.addItem({
      menuItemId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      variantName: selectedVariant?.name,
      priceCents,
      imageUrl: displayImage,
    }, qty);
    if (!isPreview && restaurant) {
      trackAddToCart(
        { id: product.id, name: product.name, price: priceCents / 100, currency, quantity: qty },
        {
          metaPixelId: restaurant.metaPixelId || undefined,
          tiktokPixelId: restaurant.tiktokPixelId || undefined,
          googleAnalyticsId: restaurant.googleAnalyticsId || undefined,
          googleAdsId: restaurant.googleAdsId || undefined,
        }
      );
    }
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
    setCartOpen(true);
  };

  const pixelScripts = !isPreview && restaurant && (
    <PixelScripts
      metaPixelId={restaurant.metaPixelId || undefined}
      tiktokPixelId={restaurant.tiktokPixelId || undefined}
      googleAnalyticsId={restaurant.googleAnalyticsId || undefined}
      googleAdsId={restaurant.googleAdsId || undefined}
    />
  );

  const cartDrawer = (
    <CartDrawer
      open={cartOpen}
      onOpenChange={setCartOpen}
      items={cart.items}
      formatPrice={formatPrice}
      subtotalCents={cart.subtotalCents}
      onSetQty={cart.setQty}
      onRemove={cart.removeItem}
    />
  );

  const breadcrumb = (
    <nav className="mb-6 text-xs text-muted-foreground">
      <Link href={`/store/${slug}`} className="hover:text-foreground">Home</Link>
      <span className="mx-2">/</span>
      <Link href={`/store/${slug}/shop`} className="hover:text-foreground">Shop</Link>
      <span className="mx-2">/</span>
      <span className="text-foreground">{product.name}</span>
    </nav>
  );

  const gallerySection = (
    <div className="grid gap-4 md:grid-cols-[88px_1fr] md:gap-4">
      {gallery.length > 1 && (
        <div className="order-2 flex gap-3 overflow-x-auto md:order-1 md:flex-col md:overflow-visible">
          {gallery.map((img) => (
            <button
              key={img}
              onClick={() => setActiveImage(img)}
              className={`aspect-square w-16 shrink-0 overflow-hidden bg-[hsl(var(--muted))] transition-opacity md:w-full ${displayImage === img ? "opacity-100 ring-1 ring-foreground" : "opacity-60 hover:opacity-100"}`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className={`order-1 aspect-[3/4] overflow-hidden bg-[hsl(var(--muted))] md:order-2 ${gallery.length > 1 ? "" : "md:col-span-2 md:col-start-1"}`}>
        <AnimatePresence mode="wait">
          {displayImage ? (
            <motion.img
              key={displayImage}
              src={displayImage}
              alt={product.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No image</div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  if (theme === "adanola") {
    return (
      <div className="min-h-screen bg-background" style={storefrontColorVars(theme)}>
        {pixelScripts}
        {headerSection && (
          <T.Header storeName={restaurant!.name} slug={slug} fields={headerSection.fields as any} cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
        )}
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            {gallerySection}

            <div className="space-y-5 md:sticky md:top-20 md:self-start">
              <h1 className="text-xl font-bold text-foreground">{product.name}</h1>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{formatPrice(displayPrice)}</span>
                {!selectedVariant && sale.formattedCompareAtPrice && (
                  <span className="text-muted-foreground line-through">{sale.formattedCompareAtPrice}</span>
                )}
                {typeof product.avgRating === "number" && product.reviewCount > 0 && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <div className="flex items-center gap-1">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < Math.round(product.avgRating!) ? "fill-foreground text-foreground" : "text-muted-foreground/40"}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground underline underline-offset-2">{product.reviewCount} Reviews</span>
                    </div>
                  </>
                )}
              </div>

              {activeVariants.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">Size:</p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {activeVariants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => selectVariant(v)}
                        className={`border py-2 text-xs font-medium transition-colors ${selectedVariantId === v.id ? "border-foreground bg-foreground text-background" : "border-[hsl(var(--card-border))] text-foreground hover:border-foreground"}`}
                        data-testid={`button-variant-${v.id}`}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  size="lg"
                  className="h-11 flex-1 rounded text-xs font-medium uppercase tracking-wide"
                  disabled={outOfStock || (product.hasVariants && !selectedVariant)}
                  onClick={handleAddToCart}
                  data-testid="button-add-to-cart"
                >
                  {outOfStock ? "Out of stock" : justAdded ? "Added" : product.hasVariants && !selectedVariant ? "Choose your size" : addToCartText}
                </Button>
                {showWishlist && (
                  <button
                    onClick={() => setWishlisted((v) => !v)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-[hsl(var(--card-border))] text-foreground"
                    aria-label="Add to wishlist"
                  >
                    <Heart className="h-4 w-4" strokeWidth={1.5} fill={wishlisted ? "currentColor" : "none"} />
                  </button>
                )}
              </div>
              {showBuyNow && (
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-11 w-full rounded border border-foreground text-xs font-medium uppercase tracking-wide hover:bg-foreground hover:text-background"
                  disabled={outOfStock || (product.hasVariants && !selectedVariant)}
                  onClick={handleAddToCart}
                  data-testid="button-buy-now"
                >
                  Buy Now {formatPrice(displayPrice)}
                </Button>
              )}

              <Accordion type="single" collapsible>
                {product.description && (
                  <AccordionItem value="details">
                    <AccordionTrigger className="text-xs font-bold uppercase tracking-wide">{detailsHeading}</AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{product.description}</AccordionContent>
                  </AccordionItem>
                )}
                {(shippingReturnsText || shippingBadge || returnsBadge) && (
                  <AccordionItem value="shipping">
                    <AccordionTrigger className="text-xs font-bold uppercase tracking-wide">Shipping and Returns</AccordionTrigger>
                    <AccordionContent className="space-y-1.5 text-sm text-muted-foreground">
                      {shippingReturnsText ? (
                        <p className="whitespace-pre-line">{shippingReturnsText}</p>
                      ) : (
                        <>
                          {shippingBadge && <p className="flex items-center gap-2"><Truck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />{shippingBadge.label}{shippingBadge.detail ? ` — ${shippingBadge.detail}` : ""}</p>}
                          {returnsBadge && <p className="flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />{returnsBadge.label}{returnsBadge.detail ? ` — ${returnsBadge.detail}` : ""}</p>}
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )}
                {product.reviews.length > 0 && (
                  <AccordionItem value="reviews">
                    <AccordionTrigger className="text-xs font-bold uppercase tracking-wide">Reviews ({product.reviewCount})</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        {product.reviews.slice(0, 5).map((r) => (
                          <div key={r.id} className="space-y-1">
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-foreground text-foreground" : "text-muted-foreground/40"}`} />
                              ))}
                            </div>
                            {r.comment && <p className="text-sm text-muted-foreground">"{r.comment}"</p>}
                            <p className="text-xs font-medium text-foreground">{r.customerName}</p>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>
          </div>

          {product.relatedItems.length > 0 && (
            <div className="mt-8 border-t border-[hsl(var(--card-border))]">
              <T.ProductGrid heading={relatedHeading} items={product.relatedItems as any} slug={slug} formatPrice={formatPrice} />
            </div>
          )}
          {showAboutUs && <T.AboutUs fields={aboutUsSection!.fields as any} />}
        </main>
        {trustBadgesSection && <T.TrustBadges fields={trustBadgesSection.fields as any} />}
        {newsletterSection && <T.Newsletter fields={newsletterSection.fields as any} slug={slug} />}
        {footerSection && restaurant && (
          <T.Footer fields={footerSection.fields as any} storeName={restaurant.name} socialLinks={restaurant.socialLinks} slug={slug} />
        )}
        {cartDrawer}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={storefrontColorVars(theme)}>
      {pixelScripts}
      {headerSection && (
        <T.Header storeName={restaurant!.name} slug={slug} fields={headerSection.fields as any} cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
      )}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {breadcrumb}
        <div className="grid gap-4 md:grid-cols-[88px_1fr_minmax(320px,420px)] md:gap-10">
          {gallery.length > 1 && (
            <div className="order-2 flex gap-3 overflow-x-auto md:order-1 md:flex-col md:overflow-visible">
              {gallery.map((img) => (
                <button
                  key={img}
                  onClick={() => setActiveImage(img)}
                  className={`aspect-square w-16 shrink-0 overflow-hidden bg-muted transition-opacity md:w-full ${displayImage === img ? "opacity-100 ring-1 ring-foreground" : "opacity-60 hover:opacity-100"}`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className={`order-1 aspect-square overflow-hidden bg-muted md:order-2 ${gallery.length > 1 ? "" : "md:col-span-2 md:col-start-1"}`}>
            <AnimatePresence mode="wait">
              {displayImage ? (
                <motion.img
                  key={displayImage}
                  src={displayImage}
                  alt={product.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No image</div>
              )}
            </AnimatePresence>
          </div>

          <div className="order-3 space-y-6 md:sticky md:top-24 md:self-start">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{product.name}</h1>
              {typeof product.avgRating === "number" && product.reviewCount > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(product.avgRating!) ? "fill-foreground text-foreground" : "text-muted-foreground/40"}`} />
                    ))}
                  </div>
                  <span>{product.reviewCount} review{product.reviewCount === 1 ? "" : "s"}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold">{formatPrice(displayPrice)}</span>
              {!selectedVariant && sale.formattedCompareAtPrice && (
                <span className="text-base text-muted-foreground line-through">{sale.formattedCompareAtPrice}</span>
              )}
              {sale.onSale && !selectedVariant && (
                <span className="bg-foreground px-2.5 py-1 text-xs font-normal uppercase tracking-wide text-background">-{sale.discountPercent}%</span>
              )}
            </div>

            {product.description && <p className="text-[15px] leading-relaxed text-muted-foreground">{product.description}</p>}

            {activeVariants.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Select option</p>
                <div className="flex flex-wrap gap-2">
                  {activeVariants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => selectVariant(v)}
                      className={`border px-4 py-2 text-sm transition-colors ${selectedVariantId === v.id ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"}`}
                      data-testid={`button-variant-${v.id}`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center border border-border">
                <button className="flex h-11 w-11 items-center justify-center hover:bg-muted" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 text-center text-sm">{qty}</span>
                <button className="flex h-11 w-11 items-center justify-center hover:bg-muted" onClick={() => setQty((q) => q + 1)}>
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <Button
                size="lg"
                className="h-11 flex-1 rounded-none text-[13px] font-medium uppercase tracking-[0.1em]"
                disabled={outOfStock || (product.hasVariants && !selectedVariant)}
                onClick={handleAddToCart}
                data-testid="button-add-to-cart"
              >
                {outOfStock ? "Out of stock" : justAdded ? "Added ✓" : addToCartText}
              </Button>
            </div>

            {showBuyNow && (
              <Button
                size="lg"
                variant="ghost"
                className="h-11 w-full rounded-none border border-foreground text-[13px] font-medium uppercase tracking-[0.1em] hover:bg-foreground hover:text-background"
                disabled={outOfStock || (product.hasVariants && !selectedVariant)}
                onClick={handleAddToCart}
                data-testid="button-buy-now"
              >
                Buy Now — {formatPrice(displayPrice)}
              </Button>
            )}

            {(shippingBadge || returnsBadge) && (
              <div className="space-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
                {shippingBadge && (
                  <p className="flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    {shippingBadge.label}{shippingBadge.detail ? ` — ${shippingBadge.detail}` : ""}
                  </p>
                )}
                {returnsBadge && (
                  <p className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    {returnsBadge.label}{returnsBadge.detail ? ` — ${returnsBadge.detail}` : ""}
                  </p>
                )}
              </div>
            )}

            <Accordion type="single" collapsible defaultValue={product.reviews.length > 0 ? undefined : "details"}>
              {product.description && (
                <AccordionItem value="details">
                  <AccordionTrigger className="text-sm font-medium">{detailsHeading}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{product.description}</AccordionContent>
                </AccordionItem>
              )}
              {shippingReturnsText && (
                <AccordionItem value="shipping">
                  <AccordionTrigger className="text-sm font-medium">Shipping and Returns</AccordionTrigger>
                  <AccordionContent className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{shippingReturnsText}</AccordionContent>
                </AccordionItem>
              )}
              {product.reviews.length > 0 && (
                <AccordionItem value="reviews">
                  <AccordionTrigger className="text-sm font-medium">Reviews ({product.reviewCount})</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-5">
                      {product.reviews.slice(0, 5).map((r) => (
                        <div key={r.id} className="space-y-1">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-foreground text-foreground" : "text-muted-foreground/40"}`} />
                            ))}
                          </div>
                          {r.comment && <p className="text-sm text-muted-foreground">"{r.comment}"</p>}
                          <p className="text-xs font-medium">{r.customerName}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        </div>

        {product.relatedItems.length > 0 && (
          <div className="mt-8 border-t border-border">
            <T.ProductGrid heading={relatedHeading} items={product.relatedItems as any} slug={slug} formatPrice={formatPrice} />
          </div>
        )}
        {showAboutUs && <T.AboutUs fields={aboutUsSection!.fields as any} />}
      </main>
      {trustBadgesSection && <T.TrustBadges fields={trustBadgesSection.fields as any} />}
      {newsletterSection && <T.Newsletter fields={newsletterSection.fields as any} slug={slug} />}
      {footerSection && restaurant && (
        <T.Footer fields={footerSection.fields as any} storeName={restaurant.name} socialLinks={restaurant.socialLinks} slug={slug} />
      )}
      {cartDrawer}
    </div>
  );
}
