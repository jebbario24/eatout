import { createContext, useCallback, useState, type ReactNode } from "react";
import type { MenuItem } from "@shared/schema";

// Moved from Storefront.tsx so the product/shop pages can share the same shape
// without re-declaring it. Behavior-identical to the original local interface.
export interface CartItem {
  menuItem?: MenuItem;
  bundle?: {
    id: string;
    name: string;
    items: string[];
    regularPrice: number;
    bundlePrice: number;
  };
  quantity: number;
  selectedOptions?: Array<{
    optionGroupLabel: string;
    choices: Array<{ label: string; priceCents: number }>;
  }>;
  // Tier 8 — the specific variant purchased, when menuItem.hasVariants. menuItem.price
  // is already overridden to the variant's price so existing subtotal/checkout math
  // (which reads menuItem.price) needs no other changes.
  variantId?: string;
  variantName?: string;
}

type CartUpdater = CartItem[] | ((prev: CartItem[]) => CartItem[]);

function loadCart(slug: string): CartItem[] {
  try {
    const raw = localStorage.getItem(`sf_cart_v1_${slug}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(slug: string, cart: CartItem[]) {
  try {
    localStorage.setItem(`sf_cart_v1_${slug}`, JSON.stringify(cart));
  } catch {
    // best-effort persistence only — a full/blocked localStorage must never break the cart
  }
}

interface StorefrontCartContextValue {
  getCart: (slug: string) => CartItem[];
  setCart: (slug: string, updater: CartUpdater) => void;
}

export const StorefrontCartContext = createContext<StorefrontCartContextValue | null>(null);

// Mounted once, above the storefront router's <Switch>, so navigating between
// the main storefront, the product page, and the shop page never loses the cart —
// each store's cart is keyed by slug and persisted to localStorage.
export function StorefrontCartProvider({ children }: { children: ReactNode }) {
  const [carts, setCarts] = useState<Record<string, CartItem[]>>({});

  const getCart = useCallback(
    (slug: string) => carts[slug] ?? loadCart(slug),
    [carts]
  );

  const setCart = useCallback((slug: string, updater: CartUpdater) => {
    setCarts((prev) => {
      const current = prev[slug] ?? loadCart(slug);
      const next = typeof updater === "function" ? (updater as (p: CartItem[]) => CartItem[])(current) : updater;
      saveCart(slug, next);
      return { ...prev, [slug]: next };
    });
  }, []);

  return (
    <StorefrontCartContext.Provider value={{ getCart, setCart }}>
      {children}
    </StorefrontCartContext.Provider>
  );
}
