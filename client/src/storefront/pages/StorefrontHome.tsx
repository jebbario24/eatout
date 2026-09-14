import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RestaurantThemeSettings, ThemeSection, CustomerReview } from "@shared/schema";
import { convertAndFormatPrice } from "@/lib/currency";
import { storefrontColorVars } from "@/storefront/lib/colorUtils";
import { useCart } from "@/storefront/lib/cartStore";
import { STOREFRONT_THEMES, resolveTheme } from "@/storefront/themeRegistry";
import { CartDrawer } from "@/storefront/components/CartDrawer";
import type { StorefrontProduct } from "@/storefront/components/ProductCard";

interface StorefrontRestaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  currency: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  themeSettings: RestaurantThemeSettings | null;
  socialLinks: Record<string, string> | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";

export function StorefrontHome({ slug }: { slug: string }) {
  const [draft, setDraft] = useState<{ themeSettings?: RestaurantThemeSettings; colors?: Record<string, string> } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart(slug);

  const { data: restaurant, isLoading, isError } = useQuery<StorefrontRestaurant>({
    queryKey: [`/api/storefront/${slug}`],
  });
  const { data: products } = useQuery<StorefrontProduct[]>({
    queryKey: [`/api/storefront/${slug}/products`],
    enabled: !!restaurant,
  });
  const { data: reviews } = useQuery<CustomerReview[]>({
    queryKey: [`/api/storefront/${slug}/reviews`],
    enabled: !!restaurant,
  });

  useEffect(() => {
    if (!isPreview) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "STOREFRONT_DRAFT_UPDATE") {
        setDraft({ themeSettings: event.data.themeSettings, colors: event.data.colors });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading store...</div>;
  }
  if (isError || !restaurant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Store not found</h1>
        <p className="text-muted-foreground">This store doesn't exist or isn't active right now.</p>
      </div>
    );
  }

  const themeSettings = draft?.themeSettings || restaurant.themeSettings;
  const sections: ThemeSection[] = themeSettings?.layout?.sections || [];
  const theme = resolveTheme(themeSettings?.theme);
  const T = STOREFRONT_THEMES[theme];

  if (sections.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <p className="text-muted-foreground">This store is being set up — check back soon.</p>
      </div>
    );
  }

  const formatPrice = (n: number) => convertAndFormatPrice(n, restaurant.currency, null);
  const items = products || [];
  const base = `/store/${slug}`;

  const bestSellers = items.filter((i: any) => Array.isArray(i.tags) && i.tags.some((t: string) => /bestseller/i.test(t)));

  const handleQuickAdd = (item: StorefrontProduct) => {
    cart.addItem({
      menuItemId: item.id,
      name: item.name,
      priceCents: Math.round(Number(item.price) * 100),
      imageUrl: item.imageUrl,
    }, 1);
    setCartOpen(true);
  };

  const renderSection = (section: ThemeSection) => {
    if (!section.enabled) return null;
    switch (section.type) {
      case "hero":
        return <T.Hero key="hero" fields={section.fields as any} shopHref={`${base}/shop`} />;
      case "trustBadges":
        return <T.TrustBadges key="trustBadges" fields={section.fields as any} />;
      case "featuredProducts":
        return (
          <div id="featured" key="featuredProducts">
            <T.ProductGrid heading={section.fields.heading || "Featured"} items={items.slice(0, section.fields.limit || 8)} slug={slug} formatPrice={formatPrice} viewAllHref={`${base}/shop`} emptyHint="New arrivals coming soon." onQuickAdd={handleQuickAdd} />
          </div>
        );
      case "bestSellers":
        return bestSellers.length === 0 ? null : (
          <T.ProductGrid key="bestSellers" heading={section.fields.heading || "Best Sellers"} items={bestSellers.slice(0, section.fields.limit || 4)} slug={slug} formatPrice={formatPrice} viewAllHref={`${base}/shop`} onQuickAdd={handleQuickAdd} />
        );
      case "banner":
        return <T.Banner key="banner" fields={section.fields as any} />;
      case "aboutUs":
        return <T.AboutUs key="aboutUs" fields={section.fields as any} />;
      case "testimonials":
        return <T.Testimonials key="testimonials" fields={section.fields as any} reviews={reviews || []} />;
      case "newsletter":
        return <T.Newsletter key="newsletter" fields={section.fields as any} slug={slug} />;
      default:
        return null;
    }
  };

  const headerSection = sections.find((s) => s.type === "header");
  const footerSection = sections.find((s) => s.type === "footer");
  const bodySections = sections.filter((s) => s.type !== "header" && s.type !== "footer");

  return (
    <div className="min-h-screen bg-background" style={storefrontColorVars(theme)}>
      {headerSection && (
        <T.Header storeName={restaurant.name} slug={slug} fields={headerSection.fields as any} cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
      )}
      <main>{bodySections.map(renderSection)}</main>
      {footerSection && (
        <T.Footer fields={footerSection.fields as any} storeName={restaurant.name} socialLinks={restaurant.socialLinks} slug={slug} />
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
