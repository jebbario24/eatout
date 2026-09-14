import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronDown } from "lucide-react";
import type { RestaurantThemeSettings } from "@shared/schema";
import { convertAndFormatPrice } from "@/lib/currency";
import { storefrontColorVars } from "@/storefront/lib/colorUtils";
import { useCart } from "@/storefront/lib/cartStore";
import { STOREFRONT_THEMES, resolveTheme } from "@/storefront/themeRegistry";
import { CartDrawer } from "@/storefront/components/CartDrawer";
import { ProductCard as FarfetchProductCard, type StorefrontProduct } from "@/storefront/components/ProductCard";
import { ProductCard as AdanolaProductCard } from "@/storefront/themes/adanola/ProductCard";

interface StorefrontRestaurant {
  name: string;
  description: string | null;
  currency: string;
  themeSettings: RestaurantThemeSettings | null;
  socialLinks: Record<string, string> | null;
}

interface Category {
  id: string;
  name: string;
}

type SortOption = "featured" | "price-asc" | "price-desc" | "newest";

const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
};

// Farfetch breaks its listing grid with a single promotional tile partway
// through — reusing the store's own Banner section keeps this data-driven
// (the merchant's real banner copy/image) instead of inventing filler content.
const BREAK_AFTER = 8;
const ADANOLA_PAGE_SIZE = 12;

export function StorefrontShop({ slug }: { slug: string }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("featured");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ADANOLA_PAGE_SIZE);
  const [sortOpen, setSortOpen] = useState(true);
  const [categoryOpen, setCategoryOpen] = useState(true);
  const cart = useCart(slug);

  const collectionHandle = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("collection") : null;

  const { data: restaurant } = useQuery<StorefrontRestaurant>({ queryKey: [`/api/storefront/${slug}`] });
  const { data: products, isLoading } = useQuery<(StorefrontProduct & { categoryId: string | null; createdAt: string | null; tags?: string[] | null; hasVariants?: boolean })[]>({
    queryKey: [`/api/storefront/${slug}/products`, collectionHandle],
    queryFn: async () => {
      const url = collectionHandle
        ? `/api/storefront/${slug}/products?collection=${encodeURIComponent(collectionHandle)}`
        : `/api/storefront/${slug}/products`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });
  const { data: categories } = useQuery<Category[]>({ queryKey: [`/api/storefront/${slug}/categories`] });

  const currency = restaurant?.currency || "USD";
  const formatPrice = (n: number) => convertAndFormatPrice(n, currency, null);
  const theme = resolveTheme(restaurant?.themeSettings?.theme);
  const T = STOREFRONT_THEMES[theme];

  const items = useMemo(() => {
    let list = products || [];
    if (categoryId) list = list.filter((i) => i.categoryId === categoryId);
    list = [...list];
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-desc":
        list.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "newest":
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
    }
    return list;
  }, [products, categoryId, sort]);

  const headerSection = restaurant?.themeSettings?.layout?.sections?.find((s) => s.type === "header");
  const footerSection = restaurant?.themeSettings?.layout?.sections?.find((s) => s.type === "footer");
  const bannerSection = restaurant?.themeSettings?.layout?.sections?.find((s) => s.type === "banner" && s.enabled && (s.fields?.heading || s.fields?.imageUrl));
  const base = `/store/${slug}`;

  const handleQuickAdd = (item: StorefrontProduct) => {
    cart.addItem({
      menuItemId: item.id,
      name: item.name,
      priceCents: Math.round(Number(item.price) * 100),
      imageUrl: item.imageUrl,
    }, 1);
    setCartOpen(true);
  };

  const breadcrumb = (
    <nav className="text-xs text-muted-foreground">
      <Link href={base} className="hover:text-foreground">Home</Link>
      <span className="mx-2">/</span>
      <span className="text-foreground">Shop</span>
    </nav>
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

  if (theme === "adanola") {
    const visible = items.slice(0, visibleCount);
    return (
      <div className="min-h-screen bg-background" style={storefrontColorVars(theme)}>
        {headerSection && restaurant && (
          <T.Header storeName={restaurant.name} slug={slug} fields={headerSection.fields as any} cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
        )}

        <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
          {breadcrumb}
        </div>

        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-6 sm:px-6 md:grid-cols-[220px_1fr] lg:px-8">
          <aside className="space-y-0">
            <button onClick={() => setSortOpen((v) => !v)} className="flex w-full items-center justify-between border-b border-[hsl(var(--card-border))] py-3 text-xs font-bold uppercase tracking-wide text-foreground">
              Sort By
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
            </button>
            {sortOpen && (
              <div className="space-y-2 py-3">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSort(key)}
                    className={`block text-xs ${sort === key ? "font-bold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {SORT_LABELS[key]}
                  </button>
                ))}
              </div>
            )}

            <button onClick={() => setCategoryOpen((v) => !v)} className="flex w-full items-center justify-between border-b border-[hsl(var(--card-border))] py-3 text-xs font-bold uppercase tracking-wide text-foreground">
              Category
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${categoryOpen ? "rotate-180" : ""}`} />
            </button>
            {categoryOpen && (
              <div className="space-y-2 py-3">
                <button onClick={() => setCategoryId(null)} className={`block text-xs ${categoryId === null ? "font-bold text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  All
                </button>
                {(categories || []).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className={`block text-xs ${categoryId === c.id ? "font-bold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {(categoryId !== null || sort !== "featured") && (
              <button
                onClick={() => { setCategoryId(null); setSort("featured"); }}
                className="mt-4 w-full bg-foreground py-2.5 text-xs font-medium uppercase tracking-wide text-background"
              >
                Clear All
              </button>
            )}
          </aside>

          <div>
            {isLoading ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Loading products...</p>
            ) : items.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No products match this selection.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3">
                  {visible.map((item) => (
                    <AdanolaProductCard key={item.id} slug={slug} item={item} formatPrice={formatPrice} onQuickAdd={handleQuickAdd} />
                  ))}
                </div>
                {visibleCount < items.length && (
                  <div className="mt-10 text-center">
                    <button
                      onClick={() => setVisibleCount((v) => v + ADANOLA_PAGE_SIZE)}
                      className="border border-foreground px-8 py-2.5 text-xs font-medium uppercase tracking-wide text-foreground transition-colors hover:bg-foreground hover:text-background"
                    >
                      Load more products
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {restaurant?.description && (
          <div className="mx-auto max-w-[1440px] border-t border-[hsl(var(--card-border))] px-4 py-10 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-foreground">Shop</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{restaurant.description}</p>
          </div>
        )}

        {footerSection && restaurant && (
          <T.Footer fields={footerSection.fields as any} storeName={restaurant.name} socialLinks={restaurant.socialLinks} slug={slug} />
        )}
        {cartDrawer}
      </div>
    );
  }

  const firstRows = bannerSection ? items.slice(0, BREAK_AFTER) : items;
  const remainingRows = bannerSection ? items.slice(BREAK_AFTER) : [];

  const renderGrid = (list: typeof items) => (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3">
      {list.map((item) => (
        <FarfetchProductCard key={item.id} slug={slug} item={item} formatPrice={formatPrice} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background" style={storefrontColorVars(theme)}>
      {headerSection && restaurant && (
        <T.Header storeName={restaurant.name} slug={slug} fields={headerSection.fields as any} cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
      )}

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {breadcrumb}
        <h1 className="mt-4 font-serif text-3xl font-normal tracking-tight sm:text-4xl">Shop</h1>
        {restaurant?.description && (
          <div className="mt-3 max-w-2xl">
            <p className={`text-[15px] leading-relaxed text-muted-foreground ${descriptionExpanded ? "" : "line-clamp-2"}`}>
              {restaurant.description}
            </p>
            {restaurant.description.length > 140 && (
              <button
                onClick={() => setDescriptionExpanded((v) => !v)}
                className="mt-1 text-[13px] font-medium underline underline-offset-4"
              >
                {descriptionExpanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCategoryId(null)}
              className={`border px-4 py-1.5 text-[13px] transition-colors ${categoryId === null ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground"}`}
            >
              All
            </button>
            {(categories || []).map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`border px-4 py-1.5 text-[13px] transition-colors ${categoryId === c.id ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs">
            <span className="uppercase tracking-[0.1em] text-muted-foreground">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="border-0 border-b border-border bg-transparent py-1 text-[13px] text-foreground outline-none focus:border-foreground"
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                <option key={key} value={key}>{SORT_LABELS[key]}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="py-4 text-xs text-muted-foreground">{items.length} product{items.length === 1 ? "" : "s"}</p>

        {isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading products...</p>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No products match this selection.</p>
        ) : (
          <>
            {renderGrid(firstRows)}
            {remainingRows.length > 0 && <div className="mt-10">{renderGrid(remainingRows)}</div>}
          </>
        )}
      </div>

      {bannerSection && <T.Banner fields={bannerSection.fields as any} />}

      {(categories || []).length > 0 && (
        <div className="mx-auto max-w-7xl border-t border-border px-4 py-10 sm:px-6 lg:px-8">
          <p className="mb-4 text-xs font-normal uppercase tracking-[0.14em] text-muted-foreground">You might also like</p>
          <div className="flex flex-wrap gap-2">
            {(categories || []).map((c) => (
              <button
                key={c.id}
                onClick={() => { setCategoryId(c.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="border border-border px-4 py-1.5 text-[13px] text-foreground transition-colors hover:border-foreground"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {footerSection && restaurant && (
        <T.Footer fields={footerSection.fields as any} storeName={restaurant.name} socialLinks={restaurant.socialLinks} slug={slug} />
      )}
      {cartDrawer}
    </div>
  );
}
