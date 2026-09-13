import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useResolvedSlug } from "@/hooks/useResolvedSlug";
import { useStorefrontCart } from "@/hooks/useStorefrontCart";
import { useStorefrontMarket } from "@/hooks/useStorefrontMarket";
import { useStorefrontCustomer } from "@/hooks/useStorefrontCustomer";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
import { StorefrontBrandStyle } from "@/components/storefront/StorefrontBrandStyle";
import { StorefrontCartSheet } from "@/components/storefront/StorefrontCartSheet";
import { CustomerAuthDialog } from "@/components/storefront/CustomerAuthDialog";
import { MenuItemCard } from "@/components/storefront/MenuItemCard";
import { getSaleInfo } from "@/lib/salePricing";
import { VariantPicker } from "@/components/storefront/VariantPicker";
import { ItemOptionsForm, type SelectedOption } from "@/components/storefront/ItemOptionsForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { Restaurant, MenuItem } from "@shared/schema";

const gridStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const cardIn = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

// A dedicated page for one merchandising collection — the /collections/:handle
// route the server already supported but no client page ever rendered.
export default function StorefrontCollection() {
  const { handle } = useParams<{ handle: string }>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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

  const { data, isLoading, isError } = useQuery<{ collection: { title: string; description: string | null; imageUrl: string | null }; items: MenuItem[] }>({
    queryKey: [`/api/storefront/${slug}/collections/${handle}`],
    enabled: !!slug && !!handle,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}/collections/${handle}`);
      if (!r.ok) throw new Error("Collection not found");
      return r.json();
    },
  });
  const collection = data?.collection;
  const items = data?.items || [];

  const [variantPickerItem, setVariantPickerItem] = useState<MenuItem | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [optionsItem, setOptionsItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);

  const addPlainToCart = (item: MenuItem, options?: SelectedOption[]) => {
    setCart((prev) => {
      const existing = !options && prev.find((ci) => ci.menuItem?.id === item.id && !ci.variantId && !ci.selectedOptions?.length);
      if (existing) return prev.map((ci) => (ci === existing ? { ...ci, quantity: ci.quantity + 1 } : ci));
      return [...prev, { menuItem: item, quantity: 1, selectedOptions: options }];
    });
    toast({ title: `${item.name} added to cart` });
  };

  const handleQuickAdd = (item: MenuItem) => {
    if ((item as any).hasVariants && (item as any).variants?.length) {
      setVariantPickerItem(item);
      setSelectedVariantId(null);
      return;
    }
    const options = (item.options as any) || [];
    if (options.length > 0) {
      setOptionsItem(item);
      setSelectedOptions([]);
      return;
    }
    addPlainToCart(item);
  };

  const confirmVariantAdd = () => {
    if (!variantPickerItem || !selectedVariantId) return;
    const variant = ((variantPickerItem as any).variants || []).find((v: any) => v.id === selectedVariantId);
    if (!variant) return;
    const itemForCart: MenuItem = { ...variantPickerItem, price: (variant.priceCents / 100).toFixed(2) } as MenuItem;
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem?.id === variantPickerItem.id && ci.variantId === variant.id);
      if (existing) return prev.map((ci) => (ci === existing ? { ...ci, quantity: ci.quantity + 1 } : ci));
      return [...prev, { menuItem: itemForCart, quantity: 1, variantId: variant.id, variantName: variant.name }];
    });
    toast({ title: `${variantPickerItem.name} (${variant.name}) added to cart` });
    setVariantPickerItem(null);
    setSelectedVariantId(null);
  };

  const confirmOptionsAdd = () => {
    if (!optionsItem) return;
    addPlainToCart(optionsItem, selectedOptions);
    setOptionsItem(null);
    setSelectedOptions([]);
  };

  const requiredOptionsMissing = (item: MenuItem | null) =>
    !!item &&
    ((item.options as any) || []).some((group: any) => {
      if (!group.required) return false;
      const normalized = group.label?.trim().toLowerCase();
      return !selectedOptions.some((o) => o.optionGroupLabel?.trim().toLowerCase() === normalized);
    });

  const onSelectItem = (item: MenuItem) => {
    if (!item.isAvailable) return;
    if ((item as any).handle) {
      setLocation(slug ? `/store/${slug}/products/${(item as any).handle}` : `/products/${(item as any).handle}`);
      return;
    }
    handleQuickAdd(item);
  };

  const cartItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const accountHref = slug ? `/store/${slug}/account` : "/account";
  const trackHref = slug ? `/store/${slug}/track` : "/track";
  const cardStyle: "standard" | "bordered" =
    (restaurant as any)?.themeSettings?.cardStyle === "bordered" ? "bordered" : "standard";

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

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError || !collection ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <p className="text-muted-foreground">This collection isn't available.</p>
        </div>
      ) : (
        <>
          <div
            className="relative border-b bg-muted/30 overflow-hidden"
            style={collection.imageUrl ? { backgroundImage: `url(${collection.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            {collection.imageUrl && <div className="absolute inset-0 bg-black/40" />}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center ${collection.imageUrl ? "text-white" : ""}`}
            >
              <h1 className="text-3xl sm:text-4xl font-display font-bold" data-testid="text-collection-title">{collection.title}</h1>
              {collection.description && (
                <p className={`mt-3 max-w-xl mx-auto ${collection.imageUrl ? "text-white/80" : "text-muted-foreground"}`}>
                  {collection.description}
                </p>
              )}
            </motion.div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {items.length === 0 ? (
              <p className="text-muted-foreground text-center py-16">No products in this collection yet.</p>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={gridStagger}
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {items.map((item) => (
                  <motion.div key={item.id} variants={cardIn}>
                    <MenuItemCard
                      item={item}
                      displayName={item.name}
                      displayDescription={item.description}
                      cardStyle={cardStyle}
                      theme={(restaurant as any)?.themeSettings?.themeId}
                      formattedPrice={formatPrice(item.price)}
                      {...getSaleInfo(item, formatPrice)}
                      isBoosted={false}
                      onSelect={() => onSelectItem(item)}
                      onAddToCart={(e) => { e.stopPropagation(); handleQuickAdd(item); }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </>
      )}

      <Dialog open={!!variantPickerItem} onOpenChange={(open) => { if (!open) { setVariantPickerItem(null); setSelectedVariantId(null); } }}>
        <DialogContent data-testid="dialog-collection-variant-picker">
          <DialogHeader>
            <DialogTitle>{variantPickerItem?.name}</DialogTitle>
          </DialogHeader>
          <VariantPicker
            variants={(variantPickerItem as any)?.variants || []}
            selectedVariantId={selectedVariantId}
            onSelect={setSelectedVariantId}
            formatPrice={formatPrice}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantPickerItem(null)}>Cancel</Button>
            <Button onClick={confirmVariantAdd} disabled={!selectedVariantId}>Add to cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!optionsItem} onOpenChange={(open) => { if (!open) { setOptionsItem(null); setSelectedOptions([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-collection-item-options">
          <DialogHeader>
            <DialogTitle>{optionsItem?.name}</DialogTitle>
          </DialogHeader>
          {optionsItem && (
            <ItemOptionsForm
              options={(optionsItem.options as any) || []}
              selectedOptions={selectedOptions}
              onChange={setSelectedOptions}
              formatPrice={formatPrice}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOptionsItem(null)}>Cancel</Button>
            <Button onClick={confirmOptionsAdd} disabled={requiredOptionsMissing(optionsItem)}>Add to cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
