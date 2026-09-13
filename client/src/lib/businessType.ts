import { ShoppingBasket, Pill, Flower2, Store, type LucideIcon } from "lucide-react";

/**
 * Single source of truth for how each merchant vertical is labeled. This is a
 * pure product-ecommerce platform — "restaurant" is not a selectable vertical.
 * Any existing account still stored with businessType "restaurant" degrades
 * gracefully to the "retail" config via getBusinessTypeConfig's fallback below,
 * rather than crashing.
 */
export type BusinessType = "grocery" | "pharmacy" | "flowers" | "retail";

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
  /** Order fulfillment types offered at checkout / POS */
  orderTypes: { value: string; label: string }[];
}

export const BUSINESS_TYPE_CONFIG: Record<BusinessType, BusinessTypeConfig> = {
  grocery: {
    business: "Grocery Store",
    store: "store",
    catalog: "Products",
    item: "Product",
    icon: ShoppingBasket,
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
    orderTypes: [
      { value: "pickup", label: "Pickup" },
      { value: "shipping", label: "Shipping" },
    ],
  },
};

export function getBusinessTypeConfig(businessType?: string | null): BusinessTypeConfig {
  return BUSINESS_TYPE_CONFIG[(businessType as BusinessType) || "retail"] || BUSINESS_TYPE_CONFIG.retail;
}
