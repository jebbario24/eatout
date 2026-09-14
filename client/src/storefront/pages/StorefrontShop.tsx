import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { RestaurantThemeSettings } from "@shared/schema";
import { convertAndFormatPrice } from "@/lib/currency";
import { storefrontColorVars } from "@/storefront/lib/colorUtils";
import { useCart } from "@/storefront/lib/cartStore";
import { Header } from "@/storefront/components/Header";
import { Footer } from "@/storefront/components/Footer";
import { CartDrawer } from "@/storefront/components/CartDrawer";
import { ProductCard, type StorefrontProduct } from "@/storefront/components/ProductCard";

interface StorefrontRestaurant {
  name: string;
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

export function StorefrontShop({ slug }: { slug: string }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("featured");
  const cart = useCart(slug);

  const collectionHandle = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("collection") : null;

  const { data: restaurant } = useQuery<StorefrontRestaurant>({ queryKey: [`/api/storefront/${slug}`] });
  const { data: products, isLoading } = useQuery<(StorefrontProduct & { categoryId: string | null; createdAt: string | null })[]>({
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
  const base = `/store/${slug}`;

  return (
    <div className="min-h-screen bg-background" style={storefrontColorVars()}>
      {headerSection && restaurant && (
        <Header storeName={restaurant.name} slug={slug} fields={headerSection.fields as any} cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
      )}

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted-foreground">
          <Link href={base} className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Shop</span>
        </nav>
        <h1 className="mt-6 text-center font-serif text-3xl font-normal tracking-tight sm:text-4xl">Shop</h1>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[200px_1fr] lg:px-8">
        <aside className="space-y-1">
          <p className="mb-3 text-xs font-normal uppercase tracking-[0.14em] text-muted-foreground">Category</p>
          <button
            onClick={() => setCategoryId(null)}
            className={`block py-1.5 text-[13px] ${categoryId === null ? "font-medium text-foreground underline underline-offset-4" : "text-foreground/80 hover:text-foreground"}`}
          >
            All
          </button>
          {(categories || []).map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`block py-1.5 text-[13px] ${categoryId === c.id ? "font-medium text-foreground underline underline-offset-4" : "text-foreground/80 hover:text-foreground"}`}
            >
              {c.name}
            </button>
          ))}
        </aside>

        <div>
          <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
            <p className="text-xs text-muted-foreground">{items.length} product{items.length === 1 ? "" : "s"}</p>
            <label className="flex items-center gap-2 text-xs">
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

          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading products...</p>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No products match this selection.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3">
              {items.map((item) => (
                <ProductCard key={item.id} slug={slug} item={item} formatPrice={formatPrice} />
              ))}
            </div>
          )}
        </div>
      </div>

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
