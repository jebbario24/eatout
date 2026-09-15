import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { MerchantThemeSettings } from "@shared/schema";
import { storefrontColorVars } from "@/storefront/lib/colorUtils";
import { useCart } from "@/storefront/lib/cartStore";
import { STOREFRONT_THEMES, resolveTheme } from "@/storefront/themeRegistry";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { convertAndFormatPrice } from "@/lib/currency";
import { PixelScripts } from "@/components/PixelScripts";
import { Loader2, ShoppingBag } from "lucide-react";

// Don't throw at module load — this file is only reached by navigating to
// /store/:slug/checkout, but keep the same defensive pattern as Subscribe.tsx.
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

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

interface CheckoutSession {
  orderId: string;
  orderNumber: string;
  clientSecret: string;
  total: string;
  currency: string;
}

function PaymentStep({ slug, orderId, returnUrl }: { slug: string; orderId: string; returnUrl: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const cart = useCart(slug);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (error) {
      toast({ title: "Payment failed", description: error.message, variant: "destructive" });
      setIsProcessing(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      cart.clear();
      navigate(`/store/${slug}/order/${orderId}`);
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button type="submit" size="lg" className="h-11 w-full" disabled={!stripe || isProcessing} data-testid="button-pay">
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
          </>
        ) : (
          "Pay now"
        )}
      </Button>
    </form>
  );
}

export function StorefrontCheckout({ slug }: { slug: string }) {
  const [, navigate] = useLocation();
  const cart = useCart(slug);
  const { toast } = useToast();
  const base = `/store/${slug}`;

  const { data: merchant } = useQuery<StorefrontMerchant>({ queryKey: [`/api/storefront/${slug}`] });

  const [orderType, setOrderType] = useState<"pickup" | "shipping">("pickup");
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const formatPrice = (n: number) => convertAndFormatPrice(n, merchant?.currency || "USD", null);
  const themeSettings = merchant?.themeSettings;
  const theme = resolveTheme(themeSettings?.theme);
  const T = STOREFRONT_THEMES[theme];
  const isAdanola = theme === "adanola";
  const isMaison = theme === "maison";
  const headerSection = themeSettings?.layout?.sections?.find((s) => s.type === "header");
  const footerSection = themeSettings?.layout?.sections?.find((s) => s.type === "footer");

  const inputClass = isAdanola
    ? "w-full rounded border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground"
    : isMaison
    ? "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
    : "w-full border-0 border-b border-border bg-transparent py-2 text-[15px] outline-none focus:border-foreground";
  const labelClass = isAdanola
    ? "mb-1.5 block text-xs font-bold uppercase tracking-wide text-foreground"
    : isMaison
    ? "mb-1.5 block text-xs font-medium uppercase tracking-[0.1em] text-primary"
    : "mb-1.5 block text-xs font-normal uppercase tracking-[0.1em] text-muted-foreground";

  const handleStartCheckout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setIsStarting(true);
    try {
      const res = await apiRequest(`/api/storefront/${slug}/checkout`, "POST", {
        orderType,
        customerName: String(data.get("customerName") || ""),
        customerPhone: String(data.get("customerPhone") || "") || undefined,
        customerEmail: String(data.get("customerEmail") || ""),
        shippingAddress: orderType === "shipping" ? String(data.get("shippingAddress") || "") : undefined,
        items: cart.items.map((i) => ({ menuItemId: i.menuItemId, variantId: i.variantId, quantity: i.qty })),
      });
      const json = await res.json();
      setSession(json);
    } catch (err: any) {
      // apiRequest throws `Error("<status>: <raw response body>")` — the body
      // is our own JSON error payload, so pull `.message` back out of it.
      let message = "Please check your details and try again.";
      const raw = typeof err?.message === "string" ? err.message.replace(/^\d+:\s*/, "") : "";
      try {
        const body = JSON.parse(raw);
        if (body?.message) message = body.message;
      } catch {
        // not JSON — fall back to default message
      }
      toast({ variant: "destructive", title: "Couldn't start checkout", description: message });
    } finally {
      setIsStarting(false);
    }
  };

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
        <T.Header storeName={merchant.name} slug={slug} fields={headerSection.fields as any} cartCount={cart.count} onOpenCart={() => {}} />
      )}
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link href={base} className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Checkout</span>
        </nav>

        {cart.items.length === 0 && !session ? (
          <div className="flex flex-col items-center gap-3 border border-border py-16 text-center">
            <ShoppingBag className="h-7 w-7 text-muted-foreground" strokeWidth={1.25} />
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <Link href={`${base}/shop`}>
              <Button variant="outline" data-testid="button-back-to-shop">Continue shopping</Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className={isAdanola ? "mb-6 text-2xl font-bold text-foreground" : isMaison ? "mb-6 font-serif text-3xl italic tracking-tight" : "mb-6 font-serif text-3xl tracking-tight"}>
              Checkout
            </h1>

            <div className="mb-8 space-y-2 border-b border-border pb-6">
              {cart.items.map((item) => (
                <div key={`${item.menuItemId}-${item.variantId || ""}`} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.qty} × {item.name}
                    {item.variantName ? ` (${item.variantName})` : ""}
                  </span>
                  <span>{formatPrice((item.priceCents * item.qty) / 100)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 text-sm font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(cart.subtotalCents / 100)}</span>
              </div>
            </div>

            {!session ? (
              <form onSubmit={handleStartCheckout} className="space-y-6">
                <div className="flex gap-2">
                  {(["pickup", "shipping"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOrderType(t)}
                      className={`flex-1 border py-2 text-xs font-medium uppercase tracking-wide ${orderType === t ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}
                      data-testid={`button-order-type-${t}`}
                    >
                      {t === "pickup" ? "Pickup" : "Shipping"}
                    </button>
                  ))}
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Name</label>
                    <input name="customerName" type="text" required className={inputClass} data-testid="input-customer-name" />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input name="customerEmail" type="email" required className={inputClass} data-testid="input-customer-email" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input name="customerPhone" type="tel" className={inputClass} data-testid="input-customer-phone" />
                </div>
                {orderType === "shipping" && (
                  <div>
                    <label className={labelClass}>Shipping address</label>
                    <textarea name="shippingAddress" required rows={3} className={`resize-none ${inputClass}`} data-testid="input-shipping-address" />
                  </div>
                )}

                <Button type="submit" size="lg" className="h-11 w-full" disabled={isStarting} data-testid="button-continue-to-payment">
                  {isStarting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing payment...
                    </>
                  ) : (
                    "Continue to payment"
                  )}
                </Button>
              </form>
            ) : !stripePromise ? (
              <p className="text-sm text-destructive">Card payments aren't configured for this store yet.</p>
            ) : (
              <Elements stripe={stripePromise} options={{ clientSecret: session.clientSecret }}>
                <PaymentStep
                  slug={slug}
                  orderId={session.orderId}
                  returnUrl={`${window.location.origin}/store/${slug}/order/${session.orderId}`}
                />
              </Elements>
            )}
          </>
        )}
      </main>
      {footerSection && merchant && (
        <T.Footer fields={footerSection.fields as any} storeName={merchant.name} socialLinks={merchant.socialLinks} slug={slug} />
      )}
    </div>
  );
}
