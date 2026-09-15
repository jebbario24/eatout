import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { MerchantThemeSettings } from "@shared/schema";
import { storefrontColorVars } from "@/storefront/lib/colorUtils";
import { useCart, type CartItem } from "@/storefront/lib/cartStore";
import { STOREFRONT_THEMES, resolveTheme } from "@/storefront/themeRegistry";
import { Button } from "@/components/ui/button";
import { convertAndFormatPrice } from "@/lib/currency";
import { PixelScripts } from "@/components/PixelScripts";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

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

export function StorefrontCart({ slug }: { slug: string }) {
  const cart = useCart(slug);
  const base = `/store/${slug}`;

  const { data: merchant } = useQuery<StorefrontMerchant>({ queryKey: [`/api/storefront/${slug}`] });

  const formatPrice = (n: number) => convertAndFormatPrice(n, merchant?.currency || "USD", null);
  const themeSettings = merchant?.themeSettings;
  const theme = resolveTheme(themeSettings?.theme);
  const T = STOREFRONT_THEMES[theme];
  const isAdanola = theme === "adanola";
  const isMaison = theme === "maison";
  const headerSection = themeSettings?.layout?.sections?.find((s) => s.type === "header");
  const footerSection = themeSettings?.layout?.sections?.find((s) => s.type === "footer");

  const headingClass = isAdanola
    ? "text-2xl font-bold text-foreground"
    : isMaison
    ? "font-serif text-3xl italic tracking-tight sm:text-4xl"
    : "font-serif text-3xl tracking-tight sm:text-4xl";
  const ctaClass = isAdanola
    ? "h-12 w-full rounded px-8 text-xs font-medium uppercase tracking-wide"
    : isMaison
    ? "h-12 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
    : "h-12 w-full rounded-none text-[13px] font-normal uppercase tracking-[0.1em]";

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

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link href={base} className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Cart</span>
        </nav>
        <h1 className={`mb-8 ${headingClass}`}>Your cart</h1>

        {cart.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border border-border py-20 text-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" strokeWidth={1.25} />
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <Link href={`${base}/shop`}>
              <Button variant="outline" data-testid="button-continue-shopping-empty">Continue shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
            <ul className="divide-y divide-border border-y border-border">
              {cart.items.map((item) => (
                <CartRow
                  key={`${item.menuItemId}-${item.variantId || ""}`}
                  item={item}
                  formatPrice={formatPrice}
                  isMaison={isMaison}
                  onSetQty={(qty) => cart.setQty(item.menuItemId, item.variantId, qty)}
                  onRemove={() => cart.removeItem(item.menuItemId, item.variantId)}
                />
              ))}
            </ul>

            <div className="h-fit space-y-5 border border-border p-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatPrice(cart.subtotalCents / 100)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Taxes and shipping calculated at checkout.</p>
              <Link href={`${base}/checkout`}>
                <Button className={ctaClass} data-testid="button-go-to-checkout">Checkout</Button>
              </Link>
              <Link href={`${base}/shop`} className="block text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                Continue shopping
              </Link>
            </div>
          </div>
        )}
      </main>

      {footerSection && merchant && (
        <T.Footer fields={footerSection.fields as any} storeName={merchant.name} socialLinks={merchant.socialLinks} slug={slug} />
      )}
    </div>
  );
}

function CartRow({ item, formatPrice, isMaison, onSetQty, onRemove }: {
  item: CartItem;
  formatPrice: (n: number) => string;
  isMaison: boolean;
  onSetQty: (qty: number) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex gap-4 py-6 sm:gap-6">
      <div className={`h-24 w-24 shrink-0 overflow-hidden bg-muted sm:h-32 sm:w-32 ${isMaison ? "rounded-xl" : ""}`}>
        {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="text-sm font-medium sm:text-[15px]">{item.name}</p>
          {item.variantName && <p className="mt-0.5 text-xs text-muted-foreground">{item.variantName}</p>}
          <p className="mt-1 text-sm text-muted-foreground">{formatPrice(item.priceCents / 100)}</p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className={`flex items-center border border-border ${isMaison ? "rounded-full" : ""}`}>
            <button className="flex h-8 w-8 items-center justify-center hover:bg-muted" onClick={() => onSetQty(item.qty - 1)} data-testid={`button-decrease-${item.menuItemId}`}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center text-sm">{item.qty}</span>
            <button className="flex h-8 w-8 items-center justify-center hover:bg-muted" onClick={() => onSetQty(item.qty + 1)} data-testid={`button-increase-${item.menuItemId}`}>
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button className="text-muted-foreground transition-colors hover:text-destructive" onClick={onRemove} data-testid={`button-remove-${item.menuItemId}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="hidden shrink-0 text-sm font-semibold sm:block">{formatPrice((item.priceCents * item.qty) / 100)}</p>
    </li>
  );
}
