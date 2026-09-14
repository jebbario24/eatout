import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RestaurantThemeSettings, ThemeSection, CustomerReview } from "@shared/schema";
import { convertAndFormatPrice } from "@/lib/currency";
import { storefrontColorVars } from "@/storefront/lib/colorUtils";
import { useCart } from "@/storefront/lib/cartStore";
import { Header } from "@/storefront/components/Header";
import { Hero } from "@/storefront/components/Hero";
import { TrustBadges } from "@/storefront/components/TrustBadges";
import { ProductGrid } from "@/storefront/components/ProductGrid";
import { Banner } from "@/storefront/components/Banner";
import { AboutUs } from "@/storefront/components/AboutUs";
import { Testimonials } from "@/storefront/components/Testimonials";
import { Newsletter } from "@/storefront/components/Newsletter";
import { Footer } from "@/storefront/components/Footer";
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

  if (sections.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <p className="text-muted-foreground">This store is being set up — check back soon.</p>
      </div>
    );
  }

  const activeColors = draft?.colors || { primaryColor: restaurant.primaryColor, secondaryColor: restaurant.secondaryColor, accentColor: restaurant.accentColor };
  const formatPrice = (n: number) => convertAndFormatPrice(n, restaurant.currency, null);
  const items = products || [];
  const base = `/store/${slug}`;

  const bestSellers = items.filter((i: any) => Array.isArray(i.tags) && i.tags.some((t: string) => /bestseller/i.test(t)));

  const renderSection = (section: ThemeSection) => {
    if (!section.enabled) return null;
    switch (section.type) {
      case "hero":
        return <Hero key="hero" fields={section.fields as any} shopHref={`${base}#featured`} />;
      case "trustBadges":
        return <TrustBadges key="trustBadges" fields={section.fields as any} />;
      case "featuredProducts":
        return (
          <div id="featured" key="featuredProducts">
            <ProductGrid heading={section.fields.heading || "Featured"} items={items} slug={slug} formatPrice={formatPrice} emptyHint="New arrivals coming soon." />
          </div>
        );
      case "bestSellers":
        return bestSellers.length === 0 ? null : (
          <ProductGrid key="bestSellers" heading={section.fields.heading || "Best Sellers"} items={bestSellers} slug={slug} formatPrice={formatPrice} />
        );
      case "banner":
        return <Banner key="banner" fields={section.fields as any} />;
      case "aboutUs":
        return <AboutUs key="aboutUs" fields={section.fields as any} />;
      case "testimonials":
        return <Testimonials key="testimonials" fields={section.fields as any} reviews={reviews || []} />;
      case "newsletter":
        return <Newsletter key="newsletter" fields={section.fields as any} slug={slug} />;
      default:
        return null;
    }
  };

  const headerSection = sections.find((s) => s.type === "header");
  const footerSection = sections.find((s) => s.type === "footer");
  const bodySections = sections.filter((s) => s.type !== "header" && s.type !== "footer");

  return (
    <div className="min-h-screen bg-background" style={storefrontColorVars(activeColors)}>
      {headerSection && (
        <Header storeName={restaurant.name} slug={slug} fields={headerSection.fields as any} cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
      )}
      <main>{bodySections.map(renderSection)}</main>
      {footerSection && (
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
