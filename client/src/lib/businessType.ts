import { ChefHat, ShoppingBasket, Pill, Flower2, Store, type LucideIcon } from "lucide-react";

/**
 * Single source of truth for how each merchant vertical is labeled and which
 * restaurant-only workflows (dine-in tables, reservations) apply to it.
 * Mirrors the vocabulary used on the public Landing page's vertical switcher
 * so a merchant sees the same language from the marketing site through to
 * their own dashboard.
 */
export type BusinessType = "restaurant" | "grocery" | "pharmacy" | "flowers" | "retail";

export interface BusinessTypeConfig {
  /** Human label for the business itself, e.g. "Flower Shop" */
  business: string;
  /** Short generic noun used in lowercase copy, e.g. "your {store} profile" */
  store: string;
  /** Nav/section label for the catalog, e.g. "Menu" vs "Products" */
  catalog: string;
  /** Singular label for one catalog entry, e.g. "Dish" vs "Product" */
  item: string;
  icon: LucideIcon;
  /** Dine-in tables + table reservations only make sense for restaurants */
  hasDineIn: boolean;
  /** Order fulfillment types offered at checkout / POS */
  orderTypes: { value: string; label: string }[];
}

export const BUSINESS_TYPE_CONFIG: Record<BusinessType, BusinessTypeConfig> = {
  restaurant: {
    business: "Restaurant",
    store: "restaurant",
    catalog: "Menu",
    item: "Item",
    icon: ChefHat,
    hasDineIn: true,
    orderTypes: [
      { value: "dine-in", label: "Dine-in" },
      // "Takeout" is the natural restaurant term, but the real fulfillment value
      // everywhere server-side (storefront checkout, draft/POS orders) is "pickup" —
      // there is no separate "takeout" order type anywhere in the backend.
      { value: "pickup", label: "Takeout" },
      { value: "shipping", label: "Shipping" },
    ],
  },
  grocery: {
    business: "Grocery Store",
    store: "store",
    catalog: "Products",
    item: "Product",
    icon: ShoppingBasket,
    hasDineIn: false,
    orderTypes: [
      { value: "pickup", label: "Pickup" },
      { value: "shipping", label: "Shipping" },
    ],
  },
  pharmacy: {
    business: "Pharmacy",
    store: "pharmacy",
    catalog: "Products",
    item: "Product",
    icon: Pill,
    hasDineIn: false,
    orderTypes: [
      { value: "pickup", label: "Pickup" },
      { value: "shipping", label: "Shipping" },
    ],
  },
  flowers: {
    business: "Flower Shop",
    store: "shop",
    catalog: "Products",
    item: "Arrangement",
    icon: Flower2,
    hasDineIn: false,
    orderTypes: [
      { value: "pickup", label: "Pickup" },
      { value: "shipping", label: "Shipping" },
    ],
  },
  retail: {
    business: "Retail Shop",
    store: "shop",
    catalog: "Products",
    item: "Product",
    icon: Store,
    hasDineIn: false,
    orderTypes: [
      { value: "pickup", label: "Pickup" },
      { value: "shipping", label: "Shipping" },
    ],
  },
};

export function getBusinessTypeConfig(businessType?: string | null): BusinessTypeConfig {
  return BUSINESS_TYPE_CONFIG[(businessType as BusinessType) || "restaurant"] || BUSINESS_TYPE_CONFIG.restaurant;
}
