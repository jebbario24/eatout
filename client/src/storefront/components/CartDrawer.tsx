import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import type { CartItem } from "@/storefront/lib/cartStore";

export function CartDrawer({ open, onOpenChange, items, formatPrice, subtotalCents, onSetQty, onRemove }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  formatPrice: (n: number) => string;
  subtotalCents: number;
  onSetQty: (menuItemId: string, variantId: string | undefined, qty: number) => void;
  onRemove: (menuItemId: string, variantId?: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Your cart</SheetTitle>
        </SheetHeader>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
            <ShoppingBag className="h-8 w-8" />
            <p className="text-sm">Your cart is empty.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto divide-y">
              {items.map((item) => (
                <div key={`${item.menuItemId}-${item.variantId || ""}`} className="flex gap-3 p-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                    <p className="text-sm">{formatPrice(item.priceCents / 100)}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => onSetQty(item.menuItemId, item.variantId, item.qty - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-4 text-center text-sm">{item.qty}</span>
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => onSetQty(item.menuItemId, item.variantId, item.qty + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="ml-auto h-6 w-6" onClick={() => onRemove(item.menuItemId, item.variantId)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-4 space-y-3">
              <div className="flex items-center justify-between font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(subtotalCents / 100)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Checkout isn't available in this preview yet.</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
