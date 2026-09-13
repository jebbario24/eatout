import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Loader2 } from "lucide-react";
import type { Restaurant, MenuItem, MenuCategory } from "@shared/schema";

const PAGE_SIZE = 24;
type SortOption = "newest" | "price-asc" | "price-desc" | "name-asc";

export default function StorefrontShop() {
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

  const { data: items = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: [`/api/storefront/${slug}/items`],
    enabled: !!slug,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}/items`);
      return r.ok ? r.json() : [];
    },
  });
  const { data: categories = [] } = useQuery<MenuCategory[]>({
    queryKey: [`/api/storefront/${slug}/categories`],
    enabled: !!slug,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}/categories`);
      return r.ok ? r.json() : [];
    },
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => (i.tags || []).forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [items]);

  const toggleTag = (tag: string) => {
    setPage(1);
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const filtered = useMemo(() => {
    let list = items;
    if (selectedCategoryId) list = list.filter((i) => i.categoryId === selectedCategoryId);
    if (selectedTags.length > 0) list = list.filter((i) => selectedTags.every((tag) => (i.tags || []).includes(tag)));
    const sorted = [...list];
    switch (sort) {
      case "price-asc": sorted.sort((a, b) => Number(a.price) - Number(b.price)); break;
      case "price-desc": sorted.sort((a, b) => Number(b.price) - Number(a.price)); break;
      case "name-asc": sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "newest":
      default:
        sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    return sorted;
  }, [items, selectedCategoryId, selectedTags, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Minimal quick-add for legacy items with no product-page handle: mirrors the
  // variant/options selection Storefront.tsx uses, without its upsell/marketing-
  // trigger cascade (that cascade belongs to the main storefront's fast-add grid).
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold mb-6">Shop</h1>

        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between mb-6">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategoryId === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => { setSelectedCategoryId(null); setPage(1); }}
              data-testid="filter-category-all"
            >
              All
            </Badge>
            {categories.map((c) => (
              <Badge
                key={c.id}
                variant={selectedCategoryId === c.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => { setSelectedCategoryId(c.id); setPage(1); }}
                data-testid={`filter-category-${c.id}`}
              >
                {c.name}
              </Badge>
            ))}
          </div>

          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="name-asc">Name: A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
                data-testid={`filter-tag-${tag}`}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pageItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-24">No products match these filters.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageItems.map((item) => (
              <MenuItemCard
                key={item.id}
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
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination className="mt-10">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink href="#" isActive={p === page} onClick={(e) => { e.preventDefault(); setPage(p); }}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      <Dialog open={!!variantPickerItem} onOpenChange={(open) => { if (!open) { setVariantPickerItem(null); setSelectedVariantId(null); } }}>
        <DialogContent data-testid="dialog-shop-variant-picker">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-shop-item-options">
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
