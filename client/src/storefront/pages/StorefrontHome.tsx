import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MerchantThemeSettings, ThemeSection, CustomerReview } from "@shared/schema";
import { convertAndFormatPrice } from "@/lib/currency";
import { storefrontColorVars } from "@/storefront/lib/colorUtils";
import { useCart } from "@/storefront/lib/cartStore";
import { STOREFRONT_THEMES, resolveTheme } from "@/storefront/themeRegistry";
import { CartDrawer } from "@/storefront/components/CartDrawer";
import type { StorefrontProduct } from "@/storefront/components/ProductCard";
import { PixelScripts, trackAddToCart } from "@/components/PixelScripts";

interface StorefrontMerchant {
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
  themeSettings: MerchantThemeSettings | null;
  socialLinks: Record<string, string> | null;
  seoTitle: string | null;
  seoDescription: string | null;
  metaPixelId?: string | null;
  tiktokPixelId?: string | null;
  googleAnalyticsId?: string | null;
  googleAdsId?: string | null;
}

const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";

export function StorefrontHome({ slug }: { slug: string }) {
  const [draft, setDraft] = useState<{ themeSettings?: MerchantThemeSettings } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart(slug);

  const { data: merchant, isLoading, isError } = useQuery<StorefrontMerchant>({
    queryKey: [`/api/storefront/${slug}`],
  });
  const { data: products } = useQuery<StorefrontProduct[]>({
    queryKey: [`/api/storefront/${slug}/products`],
    enabled: !!merchant,
  });
  const { data: reviews } = useQuery<CustomerReview[]>({
    queryKey: [`/api/storefront/${slug}/reviews`],
    enabled: !!merchant,
  });

  // A store can now have more than one "featuredProducts" section (each
  // addable independently), and each can be scoped to a different collection
  // — fetch every distinct collection referenced in one query, keyed by its
  // sorted handle list so it only refetches when that set actually changes.
  const featuredCollectionHandles = Array.from(new Set(
    (merchant?.themeSettings?.layout?.sections || [])
      .filter((s) => s.type === "featuredProducts" && s.fields?.collectionHandle)
      .map((s) => s.fields.collectionHandle as string)
  )).sort();
  const { data: collectionProductsByHandle } = useQuery<Record<string, StorefrontProduct[]>>({
    queryKey: [`/api/storefront/${slug}/products`, "collections", featuredCollectionHandles.join(",")],
    queryFn: async () => {
      const entries = await Promise.all(featuredCollectionHandles.map(async (handle) => {
        const res = await fetch(`/api/storefront/${slug}/products?collection=${encodeURIComponent(handle)}`, { credentials: "include" });
        if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
        return [handle, await res.json()] as const;
      }));
      return Object.fromEntries(entries);
    },
    enabled: !!merchant && featuredCollectionHandles.length > 0,
  });

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

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading store...</div>;
  }
  if (isError || !merchant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Store not found</h1>
        <p className="text-muted-foreground">This store doesn't exist or isn't active right now.</p>
      </div>
    );
  }

  const themeSettings = draft?.themeSettings || merchant.themeSettings;
  const sections: ThemeSection[] = themeSettings?.layout?.sections || [];
  const theme = resolveTheme(themeSettings?.theme);
  const T = STOREFRONT_THEMES[theme];

  if (sections.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{merchant.name}</h1>
        <p className="text-muted-foreground">This store is being set up — check back soon.</p>
      </div>
    );
  }

  const formatPrice = (n: number) => convertAndFormatPrice(n, merchant.currency, null);
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
    if (!isPreview) {
      trackAddToCart(
        { id: item.id, name: item.name, price: Number(item.price), currency: merchant.currency },
        {
          metaPixelId: merchant.metaPixelId || undefined,
          tiktokPixelId: merchant.tiktokPixelId || undefined,
          googleAnalyticsId: merchant.googleAnalyticsId || undefined,
          googleAdsId: merchant.googleAdsId || undefined,
        }
      );
    }
    setCartOpen(true);
  };

  const pixelScripts = !isPreview && (
    <PixelScripts
      metaPixelId={merchant.metaPixelId || undefined}
      tiktokPixelId={merchant.tiktokPixelId || undefined}
      googleAnalyticsId={merchant.googleAnalyticsId || undefined}
      googleAdsId={merchant.googleAdsId || undefined}
    />
  );

  const renderSection = (section: ThemeSection) => {
    if (!section.enabled) return null;
    const key = section.id || section.type;
    switch (section.type) {
      case "hero":
        return <T.Hero key={key} fields={section.fields as any} shopHref={`${base}/shop`} />;
      case "trustBadges":
        return <T.TrustBadges key={key} fields={section.fields as any} />;
      case "featuredProducts": {
        const featuredItems = section.fields.collectionHandle ? (collectionProductsByHandle?.[section.fields.collectionHandle] || []) : items;
        return (
          <div key={key} id={key === "featuredProducts" ? "featured" : undefined}>
            <T.ProductGrid heading={section.fields.heading || "Featured"} items={featuredItems.slice(0, section.fields.limit || 8)} slug={slug} formatPrice={formatPrice} viewAllHref={`${base}/shop`} emptyHint="New arrivals coming soon." onQuickAdd={handleQuickAdd} />
          </div>
        );
      }
      case "bestSellers":
        return bestSellers.length === 0 ? null : (
          <T.ProductGrid key={key} heading={section.fields.heading || "Best Sellers"} items={bestSellers.slice(0, section.fields.limit || 4)} slug={slug} formatPrice={formatPrice} viewAllHref={`${base}/shop`} onQuickAdd={handleQuickAdd} />
        );
      case "banner":
        return <T.Banner key={key} fields={section.fields as any} />;
      case "aboutUs":
        return <T.AboutUs key={key} fields={section.fields as any} />;
      case "testimonials":
        return <T.Testimonials key={key} fields={section.fields as any} reviews={reviews || []} />;
      case "newsletter":
        return <T.Newsletter key={key} fields={section.fields as any} slug={slug} />;
      case "customEmbed":
        return <T.CustomEmbed key={key} fields={section.fields as any} />;
      default:
        return null;
    }
  };

  const headerSection = sections.find((s) => s.type === "header");
  const footerSection = sections.find((s) => s.type === "footer");
  const bodySections = sections.filter((s) => s.type !== "header" && s.type !== "footer");

  return (
    <div className="min-h-screen bg-background" style={storefrontColorVars(theme)}>
      {pixelScripts}
      {headerSection && (
        <T.Header storeName={merchant.name} slug={slug} fields={headerSection.fields as any} cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
      )}
      <main>{bodySections.map(renderSection)}</main>
      {footerSection && (
        <T.Footer fields={footerSection.fields as any} storeName={merchant.name} socialLinks={merchant.socialLinks} slug={slug} />
      )}
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={cart.items}
        formatPrice={formatPrice}
        subtotalCents={cart.subtotalCents}
        onSetQty={cart.setQty}
        onRemove={cart.removeItem}
        slug={slug}
      />
    </div>
  );
}
