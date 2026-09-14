import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { RestaurantThemeSettings } from "@shared/schema";
import { storefrontColorVars } from "@/storefront/lib/colorUtils";
import { useCart } from "@/storefront/lib/cartStore";
import { STOREFRONT_THEMES, resolveTheme } from "@/storefront/themeRegistry";
import { CartDrawer } from "@/storefront/components/CartDrawer";
import { Markdown } from "@/components/Markdown";
import { convertAndFormatPrice } from "@/lib/currency";
import { PixelScripts } from "@/components/PixelScripts";

interface StorefrontRestaurant {
  name: string;
  currency: string;
  themeSettings: RestaurantThemeSettings | null;
  socialLinks: Record<string, string> | null;
  metaPixelId?: string | null;
  tiktokPixelId?: string | null;
  googleAnalyticsId?: string | null;
  googleAdsId?: string | null;
}

const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";

interface PageDetail {
  title: string;
  body: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export function StorefrontPage({ slug, handle }: { slug: string; handle: string }) {
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart(slug);
  const base = `/store/${slug}`;

  const { data: restaurant } = useQuery<StorefrontRestaurant>({ queryKey: [`/api/storefront/${slug}`] });
  const { data: page, isLoading, isError } = useQuery<PageDetail>({
    queryKey: [`/api/storefront/${slug}/pages/${handle}`],
  });

  const theme = resolveTheme(restaurant?.themeSettings?.theme);
  const T = STOREFRONT_THEMES[theme];
  const headerSection = restaurant?.themeSettings?.layout?.sections?.find((s) => s.type === "header");
  const footerSection = restaurant?.themeSettings?.layout?.sections?.find((s) => s.type === "footer");
  const formatPrice = (n: number) => convertAndFormatPrice(n, restaurant?.currency || "USD", null);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }
  if (isError || !page) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-2xl font-normal">Page not found</h1>
        <Link href={base} className="text-sm underline underline-offset-4">Back to store</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={storefrontColorVars(theme)}>
      {!isPreview && restaurant && (
        <PixelScripts
          metaPixelId={restaurant.metaPixelId || undefined}
          tiktokPixelId={restaurant.tiktokPixelId || undefined}
          googleAnalyticsId={restaurant.googleAnalyticsId || undefined}
          googleAdsId={restaurant.googleAdsId || undefined}
        />
      )}
      {headerSection && restaurant && (
        <T.Header storeName={restaurant.name} slug={slug} fields={headerSection.fields as any} cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
      )}
      <main className={`mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 ${theme === "adanola" ? "py-8" : "py-10"}`}>
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link href={base} className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{page.title}</span>
        </nav>
        <h1 className={theme === "adanola" ? "mb-6 text-2xl font-bold text-foreground" : "mb-8 font-serif text-3xl font-normal tracking-tight sm:text-4xl"}>
          {page.title}
        </h1>
        {page.body && <Markdown>{page.body}</Markdown>}
      </main>
      {footerSection && restaurant && (
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
