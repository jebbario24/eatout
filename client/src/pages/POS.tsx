import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MenuItem, MenuCategory, Table, Restaurant } from "@shared/schema";
import { getBusinessTypeConfig } from "@/lib/businessType";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
  variantId?: string;
  variantName?: string;
}

export default function POS() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<string>("");
  const [tableId, setTableId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: categories } = useQuery<MenuCategory[]>({
    queryKey: ["/api/menu/categories"],
  });

  const { data: items, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/items"],
  });

  const { data: tables } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
  });

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants/me"],
  });
  const businessConfig = getBusinessTypeConfig(restaurant?.businessType);
  const effectiveOrderType = orderType || businessConfig.orderTypes[0]?.value || "pickup";

  const filteredItems = selectedCategory
    ? items?.filter((item) => item.categoryId === selectedCategory && item.isAvailable)
    : items?.filter((item) => item.isAvailable);

  // Variant picker (Tier 8)
  const [variantPickerItem, setVariantPickerItem] = useState<MenuItem | null>(null);
  const [variantChoices, setVariantChoices] = useState<any[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  const addToCart = async (item: MenuItem) => {
    if ((item as any).hasVariants) {
      setVariantPickerItem(item);
      setVariantChoices([]);
      setLoadingVariants(true);
      try {
        const r = await fetch(`/api/menu/items/${item.id}/variants`, { credentials: "include" });
        const d = await r.json();
        setVariantChoices((d.variants || []).filter((v: any) => v.isActive));
      } catch {
        setVariantChoices([]);
      } finally {
        setLoadingVariants(false);
      }
      return;
    }
    const existingItem = cart.find((ci) => ci.menuItem.id === item.id && !ci.variantId);
    if (existingItem) {
      setCart(
        cart.map((ci) =>
          ci.menuItem.id === item.id && !ci.variantId
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        )
      );
    } else {
      setCart([...cart, { menuItem: item, quantity: 1 }]);
    }
  };

  const addVariantToCart = (variant: any) => {
    if (!variantPickerItem) return;
    const itemForCart: MenuItem = { ...variantPickerItem, price: (variant.priceCents / 100).toFixed(2) } as MenuItem;
    const existingItem = cart.find((ci) => ci.menuItem.id === variantPickerItem.id && ci.variantId === variant.id);
    if (existingItem) {
      setCart(cart.map((ci) => (ci === existingItem ? { ...ci, quantity: ci.quantity + 1 } : ci)));
    } else {
      setCart([...cart, { menuItem: itemForCart, quantity: 1, variantId: variant.id, variantName: variant.name }]);
    }
    setVariantPickerItem(null);
  };

  const updateQuantity = (itemId: string, delta: number, variantId?: string) => {
    setCart(
      cart
        .map((ci) =>
          ci.menuItem.id === itemId && ci.variantId === variantId
            ? { ...ci, quantity: ci.quantity + delta }
            : ci
        )
        .filter((ci) => ci.quantity > 0)
    );
  };

  const removeFromCart = (itemId: string, variantId?: string) => {
    setCart(cart.filter((ci) => !(ci.menuItem.id === itemId && ci.variantId === variantId)));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + parseFloat(item.menuItem.price) * item.quantity,
    0
  );
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/orders", "POST", {
        orderType: effectiveOrderType,
        tableId: effectiveOrderType === "dine-in" ? tableId : null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        items: cart.map((ci) => ({
          menuItemId: ci.menuItem.id,
          variantId: ci.variantId || null,
          variantName: ci.variantName || null,
          quantity: ci.quantity,
          unitPrice: ci.menuItem.price,
          notes: ci.notes,
        })),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order created successfully" });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setTableId("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/login", 500);
        return;
      }
      toast({ title: "Failed to create order", variant: "destructive" });
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-3xl font-display font-bold">Point of Sale</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-4 flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
              size="sm"
              data-testid="pos-filter-all"
            >
              All
            </Button>
            {categories?.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                size="sm"
                data-testid={`pos-filter-${category.name.toLowerCase()}`}
              >
                {category.name}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems?.map((item) => (
              <Card
                key={item.id}
                className="hover-elevate cursor-pointer active-elevate-2"
                onClick={() => addToCart(item)}
                data-testid={`pos-item-${item.id}`}
              >
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1">{item.name}</h3>
                  <p className="text-2xl font-bold text-primary">
                    ${parseFloat(item.price).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="w-96 border-l bg-card flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Current Order
            </CardTitle>
          </CardHeader>

          <div className="p-4 space-y-3 border-b">
            <Select value={effectiveOrderType} onValueChange={setOrderType}>
              <SelectTrigger data-testid="select-order-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {businessConfig.orderTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {businessConfig.hasDineIn && effectiveOrderType === "dine-in" && (
              <Select value={tableId} onValueChange={setTableId}>
                <SelectTrigger data-testid="select-table">
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {tables?.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      Table {table.tableNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Input
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              data-testid="input-customer-name"
            />
            <Input
              placeholder="Customer phone (optional)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              data-testid="input-customer-phone"
            />
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {cart.length > 0 ? (
                cart.map((item, idx) => (
                  <div
                    key={`${item.menuItem.id}-${item.variantId || idx}`}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                    data-testid={`cart-item-${item.menuItem.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.menuItem.name}</p>
                      {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                      <p className="text-sm text-muted-foreground">
                        ${parseFloat(item.menuItem.price).toFixed(2)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.menuItem.id, -1, item.variantId)}
                        data-testid={`decrease-${item.menuItem.id}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.menuItem.id, 1, item.variantId)}
                        data-testid={`increase-${item.menuItem.id}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => removeFromCart(item.menuItem.id, item.variantId)}
                        data-testid={`remove-${item.menuItem.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Cart is empty
                </p>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span data-testid="subtotal">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (10%)</span>
                <span data-testid="tax">${tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span data-testid="total">${total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              className="w-full h-12"
              disabled={cart.length === 0 || createOrderMutation.isPending}
              onClick={() => createOrderMutation.mutate()}
              data-testid="button-place-order"
            >
              {createOrderMutation.isPending ? "Processing..." : "Place Order"}
            </Button>
          </div>
        </div>
      </div>

      {/* Variant picker (Tier 8) */}
      <Dialog open={!!variantPickerItem} onOpenChange={(open) => !open && setVariantPickerItem(null)}>
        <DialogContent data-testid="dialog-pos-variant-picker">
          <DialogHeader>
            <DialogTitle>{variantPickerItem?.name}</DialogTitle>
            <DialogDescription>Choose an option</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {loadingVariants ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : variantChoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No variants configured.</p>
            ) : (
              variantChoices.map((v) => {
                const outOfStock = v.stockCount != null && v.stockCount <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => addVariantToCart(v)}
                    className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid={`pos-variant-option-${v.id}`}
                  >
                    <span className="font-medium">{v.name}</span>
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      {outOfStock ? <Badge variant="destructive">Out of stock</Badge> : `$${(v.priceCents / 100).toFixed(2)}`}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantPickerItem(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
