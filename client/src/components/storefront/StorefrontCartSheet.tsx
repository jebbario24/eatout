import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Minus, Plus, X } from "lucide-react";
import type { CartItem } from "@/hooks/useStorefrontCart";

interface StorefrontCartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  setCart: (updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  formatPrice: (cents: number) => string;
  slug?: string;
}

// Lightweight cart drawer for the product/shop pages — line items, qty +/-, remove,
// subtotal, and a single "Go to checkout" CTA that hands off to the main storefront's
// full checkout Sheet (delivery fee calc, PayPal, gift cards, loyalty — all of that
// logic lives only in Storefront.tsx and is deliberately not duplicated here).
export function StorefrontCartSheet({ open, onOpenChange, cart, setCart, formatPrice, slug }: StorefrontCartSheetProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const lineTotal = (c: CartItem) => {
    const base = c.menuItem?.price ?? c.bundle?.bundlePrice ?? 0;
    const optionsTotal = (c.selectedOptions || []).reduce(
      (s, group) => s + group.choices.reduce((cs, choice) => cs + choice.priceCents / 100, 0),
      0
    );
    return (Number(base) + optionsTotal) * c.quantity;
  };
  const subtotal = cart.reduce((sum, c) => sum + lineTotal(c), 0);

  const updateQty = (index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev];
      const item = next[index];
      if (!item) return prev;
      const qty = item.quantity + delta;
      if (qty <= 0) {
        next.splice(index, 1);
      } else {
        next[index] = { ...item, quantity: qty };
      }
      return next;
    });
  };

  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const checkoutHref = slug ? `/store/${slug}` : "/";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('storefront.cart')} ({itemCount} {t('storefront.items')})</SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('storefront.emptyCart')}</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 my-4">
              <div className="space-y-4 px-1">
                {cart.map((c, index) => (
                  <div key={index} className="flex gap-3 items-start" data-testid={`cart-sheet-item-${index}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.menuItem?.name || c.bundle?.name}</p>
                      {c.variantName && (
                        <p className="text-xs text-muted-foreground">{c.variantName}</p>
                      )}
                      {(c.selectedOptions || []).map((group, gi) => (
                        <p key={gi} className="text-xs text-muted-foreground">
                          {group.choices.map((choice) => choice.label).join(", ")}
                        </p>
                      ))}
                      <div className="flex items-center gap-2 mt-1">
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(index, -1)} data-testid={`button-decrease-${index}`}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-4 text-center">{c.quantity}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(index, 1)} data-testid={`button-increase-${index}`}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-medium">{formatPrice(lineTotal(c))}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(index)} data-testid={`button-remove-${index}`}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between font-medium">
                <span>{t('storefront.subtotal') || 'Subtotal'}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  setLocation(checkoutHref);
                }}
                data-testid="button-go-to-checkout"
              >
                {t('storefront.goToCheckout') || 'Go to checkout'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
