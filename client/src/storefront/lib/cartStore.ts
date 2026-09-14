import { useCallback, useEffect, useState } from "react";

// Client-only, localStorage-backed cart — no checkout/payment/orders
// integration in this pass (explicitly out of scope, see the plan). Gives
// "Add to cart"/"Buy now" something real to do without inventing a full
// checkout flow.
export interface CartItem {
  menuItemId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  priceCents: number;
  imageUrl?: string | null;
  qty: number;
}

function storageKey(slug: string) {
  return `eatout_cart_${slug}`;
}

function readCart(slug: string): CartItem[] {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(slug: string, items: CartItem[]) {
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(items));
  } catch {
    // best-effort only — private browsing / storage quota, never block the UI
  }
}

export function useCart(slug: string | undefined) {
  const [items, setItems] = useState<CartItem[]>(() => (slug ? readCart(slug) : []));

  useEffect(() => {
    if (slug) setItems(readCart(slug));
  }, [slug]);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    if (slug) writeCart(slug, next);
  }, [slug]);

  const addItem = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    const existing = items.find((i) => i.menuItemId === item.menuItemId && i.variantId === item.variantId);
    const next = existing
      ? items.map((i) => (i === existing ? { ...i, qty: i.qty + qty } : i))
      : [...items, { ...item, qty }];
    persist(next);
  }, [items, persist]);

  const setQty = useCallback((menuItemId: string, variantId: string | undefined, qty: number) => {
    const next = qty <= 0
      ? items.filter((i) => !(i.menuItemId === menuItemId && i.variantId === variantId))
      : items.map((i) => (i.menuItemId === menuItemId && i.variantId === variantId ? { ...i, qty } : i));
    persist(next);
  }, [items, persist]);

  const removeItem = useCallback((menuItemId: string, variantId?: string) => {
    persist(items.filter((i) => !(i.menuItemId === menuItemId && i.variantId === variantId)));
  }, [items, persist]);

  const clear = useCallback(() => persist([]), [persist]);

  const subtotalCents = items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return { items, addItem, setQty, removeItem, clear, subtotalCents, count };
}
