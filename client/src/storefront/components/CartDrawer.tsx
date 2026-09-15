import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import type { CartItem } from "@/storefront/lib/cartStore";

export function CartDrawer({ open, onOpenChange, items, formatPrice, subtotalCents, onSetQty, onRemove, slug }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  formatPrice: (n: number) => string;
  subtotalCents: number;
  onSetQty: (menuItemId: string, variantId: string | undefined, qty: number) => void;
  onRemove: (menuItemId: string, variantId?: string) => void;
  slug: string;
}) {
  const [, navigate] = useLocation();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="font-display text-base font-semibold uppercase tracking-[0.12em]">Your cart</SheetTitle>
        </SheetHeader>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
            <ShoppingBag className="h-7 w-7" strokeWidth={1.25} />
            <p className="text-sm">Your cart is empty.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.div
                    key={`${item.menuItemId}-${item.variantId || ""}`}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex gap-4 border-b border-border p-5"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden bg-muted">
                      {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="truncate text-[13px] font-medium">{item.name}</p>
                      {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                      <p className="text-[13px] font-semibold">{formatPrice(item.priceCents / 100)}</p>
                      <div className="mt-auto flex items-center gap-2 pt-1">
                        <div className="flex items-center border border-border">
                          <button className="flex h-6 w-6 items-center justify-center hover:bg-muted" onClick={() => onSetQty(item.menuItemId, item.variantId, item.qty - 1)}>
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs">{item.qty}</span>
                          <button className="flex h-6 w-6 items-center justify-center hover:bg-muted" onClick={() => onSetQty(item.menuItemId, item.variantId, item.qty + 1)}>
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button className="ml-auto text-muted-foreground transition-colors hover:text-destructive" onClick={() => onRemove(item.menuItemId, item.variantId)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="space-y-3 border-t border-border p-5">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(subtotalCents / 100)}</span>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/store/${slug}/checkout`);
                }}
                data-testid="button-checkout"
              >
                Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
