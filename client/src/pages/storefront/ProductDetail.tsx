import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useResolvedSlug } from "@/hooks/useResolvedSlug";
import { useStorefrontCart, type CartItem } from "@/hooks/useStorefrontCart";
import { useStorefrontMarket } from "@/hooks/useStorefrontMarket";
import { useStorefrontCustomer } from "@/hooks/useStorefrontCustomer";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
import { StorefrontBrandStyle } from "@/components/storefront/StorefrontBrandStyle";
import { StorefrontCartSheet } from "@/components/storefront/StorefrontCartSheet";
import { CustomerAuthDialog } from "@/components/storefront/CustomerAuthDialog";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { VariantPicker } from "@/components/storefront/VariantPicker";
import { ItemOptionsForm, type SelectedOption } from "@/components/storefront/ItemOptionsForm";
import { FrequentlyBoughtTogether } from "@/components/marketing/FrequentlyBoughtTogether";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, Loader2 } from "lucide-react";
import { getSaleInfo } from "@/lib/salePricing";
import type { Restaurant, MenuItem } from "@shared/schema";

// Standalone product detail page (Tier — storefront expansion). Deliberately does
// not replicate Storefront.tsx's upsell-modal/marketing-trigger cascade: that
// cascade is the fast quick-add path for grid clicks, while a shopper already on
// this page has seen the full item (description, options, related products) inline.
export default function ProductDetail() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { handle } = useParams<{ handle: string }>();
  const slug = useResolvedSlug();
  const { cart, setCart } = useStorefrontCart(slug);
  const { customer: sfCustomer } = useStorefrontCustomer(slug);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: [`/api/storefront/${slug}`],
    enabled: !!slug,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}`);
      if (!r.ok) throw new Error("Store not found");
      return r.json();
    },
  });

  const { markets, selectedMarketName, handleSelectMarket, formatPrice } = useStorefrontMarket(slug, restaurant?.currency);

  const itemQ = useQuery<any>({
    queryKey: [`/api/storefront/${slug}/items/handle/${handle}`],
    enabled: !!slug && !!handle,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}/items/handle/${handle}`);
      if (!r.ok) return null;
      return r.json();
    },
  });
  const item = itemQ.data as (MenuItem & { variants?: any[] }) | null | undefined;

  const { data: allItems = [] } = useQuery<MenuItem[]>({
    queryKey: [`/api/storefront/${slug}/items`],
    enabled: !!slug,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}/items`);
      return r.ok ? r.json() : [];
    },
  });

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);

  const cartItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const accountHref = slug ? `/store/${slug}/account` : "/account";
  const trackHref = slug ? `/store/${slug}/track` : "/track";

  const hasVariants = !!item?.hasVariants && (item?.variants?.length || 0) > 0;
  const options = (item?.options as any) || [];
  const selectedVariant = hasVariants ? item?.variants?.find((v: any) => v.id === selectedVariantId) : null;
  const displayPrice = selectedVariant ? selectedVariant.priceCents / 100 : Number(item?.price || 0);
  // Compare-at pricing only applies to the base item, not per-variant.
  const saleInfo = item && !hasVariants ? getSaleInfo(item, formatPrice) : { formattedCompareAtPrice: null, discountPercent: null };

  const requiredOptionsMissing = options.some((group: any) => {
    if (!group.required) return false;
    const normalized = group.label?.trim().toLowerCase();
    return !selectedOptions.some((o) => o.optionGroupLabel?.trim().toLowerCase() === normalized);
  });
  const canAddToCart = item?.isAvailable && (!hasVariants || !!selectedVariantId) && !requiredOptionsMissing;

  const handleAddToCart = () => {
    if (!item || !canAddToCart) return;

    if (hasVariants && selectedVariant) {
      const itemForCart: MenuItem = { ...item, price: (selectedVariant.priceCents / 100).toFixed(2) } as MenuItem;
      const existing = cart.find((ci) => ci.menuItem?.id === item.id && ci.variantId === selectedVariant.id);
      if (existing) {
        setCart(cart.map((ci) => (ci === existing ? { ...ci, quantity: ci.quantity + 1 } : ci)));
      } else {
        setCart([...cart, { menuItem: itemForCart, quantity: 1, variantId: selectedVariant.id, variantName: selectedVariant.name }]);
      }
      toast({ title: `${item.name} (${selectedVariant.name}) added to cart` });
      return;
    }

    setCart([...cart, { menuItem: item, quantity: 1, selectedOptions: options.length > 0 ? selectedOptions : undefined }]);
    toast({ title: `${item.name} added to cart` });
  };

  const addRelatedToCart = (related: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem?.id === related.id && !ci.variantId);
      if (existing) {
        return prev.map((ci) => (ci === existing ? { ...ci, quantity: ci.quantity + 1 } : ci));
      }
      return [...prev, { menuItem: related, quantity: 1 }];
    });
  };

  if (itemQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!itemQ.isLoading && !item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Product not found</p>
        <Link href={slug ? `/store/${slug}` : "/"}>
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back to store</Button>
        </Link>
      </div>
    );
  }

  const relatedIds = [
    ...((item?.crossSellItemIds as string[]) || []),
    ...((item?.upsellItemIds as string[]) || []),
  ];
  const relatedItems = allItems.filter((i) => relatedIds.includes(i.id) && i.isAvailable);

  const galleryImages = item
    ? [item.imageUrl, ...((item.variants || []).map((v: any) => v.imageUrl))].filter(
        (v, i, arr): v is string => !!v && arr.indexOf(v) === i
      )
    : [];

  return (
    <div className="min-h-screen bg-background">
      <StorefrontBrandStyle restaurant={restaurant} themeId={(restaurant as any)?.themeSettings?.themeId} />
      {restaurant && (
        <StorefrontHeader
          restaurant={restaurant}
          markets={markets}
          selectedMarketName={selectedMarketName}
          onSelectMarket={handleSelectMarket}
          sfCustomer={sfCustomer}
          accountHref={accountHref}
          trackHref={trackHref}
          cartItemCount={cartItemCount}
          onOpenAuth={() => setAuthOpen(true)}
          onOpenCart={() => setCartOpen(true)}
        />
      )}

      {item && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href={slug ? `/store/${slug}` : "/"} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to store
          </Link>

          <div className="grid gap-10 md:grid-cols-2">
            <ProductGallery images={galleryImages} alt={item.name} />

            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold" data-testid="text-product-name">{item.name}</h1>
                {item.description && (
                  <p className="text-muted-foreground mt-2">{item.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-2xl font-bold ${saleInfo.formattedCompareAtPrice ? "text-[hsl(0,84%,46%)]" : "text-primary"}`}
                  data-testid="text-product-price"
                >
                  {formatPrice(displayPrice)}
                </span>
                {saleInfo.formattedCompareAtPrice && (
                  <span className="text-lg text-muted-foreground line-through">{saleInfo.formattedCompareAtPrice}</span>
                )}
                {!!saleInfo.discountPercent && (
                  <Badge className="bg-[hsl(0,84%,46%)] text-white border-transparent" data-testid="badge-sale">
                    -{saleInfo.discountPercent}%
                  </Badge>
                )}
              </div>

              {!item.isAvailable && <Badge variant="destructive">Out of stock</Badge>}

              {hasVariants && (
                <VariantPicker
                  variants={item.variants || []}
                  selectedVariantId={selectedVariantId}
                  onSelect={setSelectedVariantId}
                  formatPrice={formatPrice}
                />
              )}

              {options.length > 0 && (
                <ItemOptionsForm
                  options={options}
                  selectedOptions={selectedOptions}
                  onChange={setSelectedOptions}
                  formatPrice={formatPrice}
                />
              )}

              <Button
                size="lg"
                className="w-full"
                disabled={!canAddToCart}
                onClick={handleAddToCart}
                data-testid="button-product-add-to-cart"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {t('storefront.addToCart') || 'Add to cart'}
              </Button>

              {relatedItems.length > 0 && (
                <FrequentlyBoughtTogether
                  currentItem={item}
                  relatedItems={relatedItems}
                  onAddToCart={addRelatedToCart}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <StorefrontCartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        cart={cart}
        setCart={setCart}
        formatPrice={formatPrice}
        slug={slug}
      />

      {slug && <CustomerAuthDialog slug={slug} open={authOpen} onOpenChange={setAuthOpen} />}
    </div>
  );
}
