import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { MerchantThemeSettings } from "@shared/schema";
import { storefrontColorVars } from "@/storefront/lib/colorUtils";
import { STOREFRONT_THEMES, resolveTheme } from "@/storefront/themeRegistry";
import { Button } from "@/components/ui/button";
import { convertAndFormatPrice } from "@/lib/currency";
import { PixelScripts } from "@/components/PixelScripts";
import { CircleCheck, Loader2 } from "lucide-react";

interface StorefrontMerchant {
  name: string;
  currency: string;
  themeSettings: MerchantThemeSettings | null;
  socialLinks: Record<string, string> | null;
  metaPixelId?: string | null;
  tiktokPixelId?: string | null;
  googleAnalyticsId?: string | null;
  googleAdsId?: string | null;
}

interface OrderSummary {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  orderType: string;
  total: string;
  currency: string;
  items: { name: string; variantName: string | null; quantity: number; subtotal: string }[];
}

// The Stripe webhook that flips paymentStatus to "paid" can land a beat after
// the card is actually charged — poll briefly instead of showing a false negative.
export function StorefrontOrderConfirmation({ slug, orderId }: { slug: string; orderId: string }) {
  const base = `/store/${slug}`;

  const { data: merchant } = useQuery<StorefrontMerchant>({ queryKey: [`/api/storefront/${slug}`] });
  const { data: order, isLoading } = useQuery<OrderSummary>({
    queryKey: [`/api/storefront/${slug}/orders/${orderId}`],
    refetchInterval: (query) =>
      query.state.data?.paymentStatus === "pending" && query.state.dataUpdateCount < 10 ? 2000 : false,
  });

  const themeSettings = merchant?.themeSettings;
  const theme = resolveTheme(themeSettings?.theme);
  const T = STOREFRONT_THEMES[theme];
  const isAdanola = theme === "adanola";
  const isMaison = theme === "maison";
  const headerSection = themeSettings?.layout?.sections?.find((s) => s.type === "header");
  const footerSection = themeSettings?.layout?.sections?.find((s) => s.type === "footer");
  const formatPrice = (n: number) => convertAndFormatPrice(n, order?.currency || merchant?.currency || "USD", null);

  const isConfirmed = order?.paymentStatus === "paid";
  const isPending = !order || order.paymentStatus === "pending";

  return (
    <div className="min-h-screen bg-background" style={storefrontColorVars(theme)}>
      {merchant && (
        <PixelScripts
          metaPixelId={merchant.metaPixelId || undefined}
          tiktokPixelId={merchant.tiktokPixelId || undefined}
          googleAnalyticsId={merchant.googleAnalyticsId || undefined}
          googleAdsId={merchant.googleAdsId || undefined}
        />
      )}
      {headerSection && merchant && (
        <T.Header storeName={merchant.name} slug={slug} fields={headerSection.fields as any} cartCount={0} onOpenCart={() => {}} />
      )}
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !order ? (
          <div className="text-center">
            <p className="mb-6 text-sm text-muted-foreground">We couldn't find that order.</p>
            <Link href={base}>
              <Button variant="outline">Back to store</Button>
            </Link>
          </div>
        ) : (
          <div className="text-center">
            {isConfirmed ? (
              <CircleCheck className="mx-auto mb-4 h-10 w-10 text-green-600" />
            ) : isPending ? (
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-muted-foreground" />
            ) : null}
            <h1 className={isAdanola ? "mb-2 text-2xl font-bold text-foreground" : isMaison ? "mb-2 font-serif text-3xl italic tracking-tight" : "mb-2 font-serif text-3xl tracking-tight"}>
              {isConfirmed ? "Order confirmed" : isPending ? "Confirming your payment..." : "Payment not completed"}
            </h1>
            <p className="mb-8 text-sm text-muted-foreground">
              {isConfirmed
                ? `Order ${order.orderNumber} — a confirmation has been sent to your email.`
                : isPending
                ? "This usually takes a few seconds."
                : `Order ${order.orderNumber} wasn't charged. Please try again.`}
            </p>

            <div className="mb-8 space-y-2 border-y border-border py-6 text-left">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.quantity} × {item.name}
                    {item.variantName ? ` (${item.variantName})` : ""}
                  </span>
                  <span>{formatPrice(parseFloat(item.subtotal))}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 text-sm font-semibold">
                <span>Total</span>
                <span>{formatPrice(parseFloat(order.total))}</span>
              </div>
            </div>

            <Link href={base}>
              <Button data-testid="button-back-to-store">Back to store</Button>
            </Link>
          </div>
        )}
      </main>
      {footerSection && merchant && (
        <T.Footer fields={footerSection.fields as any} storeName={merchant.name} socialLinks={merchant.socialLinks} slug={slug} />
      )}
    </div>
  );
}
