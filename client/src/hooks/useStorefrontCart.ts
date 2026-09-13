import { useContext } from "react";
import { StorefrontCartContext, type CartItem } from "@/contexts/StorefrontCartContext";

export type { CartItem };

/**
 * Same shape as `useState<CartItem[]>` ({ cart, setCart }), but backed by the
 * shared StorefrontCartProvider so the cart survives navigation between the main
 * storefront, the product page, and the shop page. `slug` may be undefined only
 * transiently (before the restaurant/slug resolves); a stable fallback key is used
 * so no cart operations are lost during that window.
 */
export function useStorefrontCart(slug: string | undefined) {
  const ctx = useContext(StorefrontCartContext);
  if (!ctx) {
    throw new Error("useStorefrontCart must be used within a StorefrontCartProvider");
  }
  const key = slug || "__default__";
  const cart = ctx.getCart(key);
  const setCart = (updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => ctx.setCart(key, updater);
  return { cart, setCart };
}
