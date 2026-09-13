import type { Restaurant, MenuItem, CustomerReview, Collection } from "@shared/schema";
import { pickPalette, type Palette, type StoreVertical, type StoreTier } from "@shared/paletteBank";

// The deterministic half of the AI store builder (see storeCopywriter.ts for the
// optional LLM-backed copy layer). Every decision here is plain data/rules — no
// external calls — so the feature works with zero configuration, and every
// decision carries a plain-English `reason` so the merchant sees why.

export type SectionType =
  | "image-banner" | "image-with-text" | "multicolumn" | "rich-text"
  | "newsletter" | "testimonials" | "faq";

export interface StoreBrief {
  description?: string;
  targetAudience?: string;
  targetMarket?: string;
  stylePreference?: string;
}

export interface Decision<T> {
  value: T;
  reason: string;
}

export interface NewSectionPlan {
  type: SectionType;
  reason: string;
  // Plain themeSettings-shaped section (id/enabled added at apply time); copy
  // fields (heading/text/blocks-with-real-copy) are filled in by storeCopywriter
  // when available, otherwise left as sensible template defaults here.
  settings: Record<string, any>;
  blocks: Array<{ type: string; settings: Record<string, any> }>;
}

export interface CollectionPlan {
  title: string;
  reason: string;
  menuItemIds: string[];
}

export interface StoreBlueprint {
  vertical: StoreVertical;
  tier: StoreTier;
  signals: string[];
  palette: Decision<Palette> | null;
  themeId: Decision<string | undefined>;
  cardStyle: Decision<"standard" | "bordered">;
  homepageLayout: Decision<"full" | "curated">;
  newSections: NewSectionPlan[];
  collectionsToCreate: CollectionPlan[];
  socialFooterGroup: Decision<boolean>;
  navPlan: Decision<Array<{ id: string; label: string; type: string; value?: string }>> | null;
}

const LUXURY_WORDS = ["luxury", "premium", "high-end", "couture", "exclusive", "bespoke", "designer"];
const STREETWEAR_WORDS = ["streetwear", "street wear", "urban", "hype", "sneaker", "drip"];
const ELECTRONICS_WORDS = ["electronics", "gadget", "tech", "device", "audio", "computer"];
const BEAUTY_WORDS = ["beauty", "cosmetic", "makeup", "skincare", "skin care"];
const WELLNESS_WORDS = ["wellness", "organic", "natural", "eco", "sustainable", "yoga", "mindful"];
const HOME_WORDS = ["home decor", "furniture", "interior", "decor"];
const BUDGET_WORDS = ["affordable", "budget", "cheap", "value"];

function detectVertical(businessType: string, description: string): StoreVertical {
  const d = description.toLowerCase();
  if (businessType === "grocery") return "grocery";
  if (businessType === "pharmacy") return "pharmacy";
  if (businessType === "flowers") return "flowers";
  if (LUXURY_WORDS.some((w) => d.includes(w)) && (d.includes("fashion") || d.includes("cloth") || d.includes("apparel") || d.includes("wear")))
    return "luxury-fashion";
  if (STREETWEAR_WORDS.some((w) => d.includes(w))) return "streetwear";
  if (ELECTRONICS_WORDS.some((w) => d.includes(w))) return "electronics";
  if (BEAUTY_WORDS.some((w) => d.includes(w))) return "beauty";
  if (WELLNESS_WORDS.some((w) => d.includes(w))) return "wellness";
  if (HOME_WORDS.some((w) => d.includes(w))) return "home-decor";
  if (LUXURY_WORDS.some((w) => d.includes(w))) return "luxury-fashion";
  return "general-retail";
}

function detectTier(description: string, avgPriceDollars: number): StoreTier {
  const d = description.toLowerCase();
  if (LUXURY_WORDS.some((w) => d.includes(w))) return "luxury";
  if (BUDGET_WORDS.some((w) => d.includes(w))) return "budget";
  if (avgPriceDollars >= 150) return "luxury";
  if (avgPriceDollars >= 60) return "premium";
  if (avgPriceDollars >= 20) return "mid";
  return "budget";
}

function themeForVertical(vertical: StoreVertical, tier: StoreTier): string | undefined {
  if (vertical === "luxury-fashion" || tier === "luxury") return "editorial";
  if (vertical === "streetwear" || vertical === "electronics") return "nova";
  if (vertical === "wellness" || vertical === "beauty") return "wellness";
  if (vertical === "grocery" || vertical === "flowers") return "fresh";
  return undefined; // Classic
}

export interface IntelligenceInput {
  restaurant: Restaurant;
  items: MenuItem[];
  reviews: CustomerReview[];
  collections: Collection[];
  existingSectionTypes: SectionType[];
  brief?: StoreBrief;
  hasCustomNav: boolean;
  hasCustomColors: boolean;
}

export function buildStoreBlueprint(input: IntelligenceInput): StoreBlueprint {
  const { restaurant, items, reviews, collections, existingSectionTypes, brief, hasCustomNav, hasCustomColors } = input;
  const description = [brief?.description, brief?.targetAudience, brief?.stylePreference, restaurant.description]
    .filter(Boolean).join(" ");
  const signals: string[] = [`businessType:${restaurant.businessType}`];

  const available = items.filter((i) => i.isAvailable);
  const prices = available.map((i) => Number(i.priceCents || 0) / 100).filter((p) => p > 0);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  if (avgPrice > 0) signals.push(`avgPrice:$${avgPrice.toFixed(2)}`);

  const vertical = detectVertical(restaurant.businessType, description);
  const tier = detectTier(description, avgPrice);
  signals.push(`vertical:${vertical}`, `tier:${tier}`);

  const themeId = themeForVertical(vertical, tier);
  const palette: Decision<Palette> | null = hasCustomColors
    ? null
    : { value: pickPalette(vertical, tier), reason: `No brand colors set yet — chose a ${tier} ${vertical.replace("-", " ")} palette to match the detected style.` };

  const cardStyle: Decision<"standard" | "bordered"> = {
    value: tier === "luxury" || tier === "premium" ? "standard" : "bordered",
    reason: tier === "luxury" || tier === "premium"
      ? "Borderless, image-first cards read as more premium."
      : "Bordered cards give clearer per-item structure for a high-item-count catalog.",
  };

  const bestsellerTagged = available.filter((i) => (i.tags || []).some((t) => /bestseller|popular/i.test(t)));
  const homepageLayout: Decision<"full" | "curated"> = {
    value: available.length >= 12 && bestsellerTagged.length >= 3 ? "curated" : "full",
    reason: available.length >= 12 && bestsellerTagged.length >= 3
      ? `You have ${available.length} products with ${bestsellerTagged.length} tagged Bestseller/Popular — a curated homepage highlights them instead of listing everything.`
      : "Not enough tagged bestsellers yet to curate — showing the full catalog.",
  };

  const newSections: NewSectionPlan[] = [];
  const has = (t: SectionType) => existingSectionTypes.includes(t);

  if (description.trim() && !has("rich-text")) {
    newSections.push({
      type: "rich-text",
      reason: "You provided a brand description — added a brand-story section so shoppers see it, not just you.",
      settings: { heading: "Our story", text: "", buttonLabel: "", buttonUrl: "", colorScheme: "default" },
      blocks: [],
    });
  }

  const publishedReviews = reviews.filter((r) => r.isPublished);
  const goodReviews = publishedReviews.filter((r) => r.rating >= 4);
  if (goodReviews.length >= 3 && !has("testimonials")) {
    newSections.push({
      type: "testimonials",
      reason: `You have ${goodReviews.length} published 4-5 star reviews not currently shown as testimonials — added a section populated from them.`,
      settings: { heading: "What customers are saying", colorScheme: "default" },
      blocks: goodReviews.slice(0, 6).map((r) => ({
        type: "testimonial",
        settings: { customerName: r.customerName, quote: r.comment || "", rating: r.rating },
      })),
    });
  }

  if (!has("multicolumn")) {
    newSections.push({
      type: "multicolumn",
      reason: "A short 'why shop with us' row helps first-time visitors trust the store.",
      settings: { heading: "Why shop with us", columns: 3, colorScheme: "default" },
      blocks: [], // filled with real copy by storeCopywriter, or template defaults applied at generation time
    });
  }

  if (!has("faq")) {
    newSections.push({
      type: "faq",
      reason: "A short FAQ reduces pre-purchase hesitation (shipping, returns, sizing).",
      settings: { heading: "Frequently asked questions", colorScheme: "default" },
      blocks: [],
    });
  }

  if (!has("newsletter")) {
    newSections.push({
      type: "newsletter",
      reason: "Capturing emails gives you a channel that doesn't depend on ads or algorithms.",
      settings: { heading: "Subscribe to our emails", text: "Be the first to know about new arrivals and offers.", colorScheme: "default" },
      blocks: [],
    });
  }

  const collectionsToCreate: CollectionPlan[] = [];
  const existingTitles = new Set(collections.map((c) => c.title.toLowerCase()));
  if (bestsellerTagged.length >= 3 && !existingTitles.has("best sellers")) {
    collectionsToCreate.push({
      title: "Best Sellers",
      reason: `${bestsellerTagged.length} products are tagged Bestseller/Popular.`,
      menuItemIds: bestsellerTagged.slice(0, 24).map((i) => i.id),
    });
  }
  const newest = [...available].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  if (newest.length >= 6 && !existingTitles.has("new arrivals")) {
    collectionsToCreate.push({
      title: "New Arrivals",
      reason: `${newest.length} products in your catalog — a New Arrivals collection surfaces the newest ones.`,
      menuItemIds: newest.slice(0, 12).map((i) => i.id),
    });
  }

  const socialFooterGroup: Decision<boolean> = {
    value: !!(restaurant.socialLinks && Object.values(restaurant.socialLinks as any).some(Boolean)),
    reason: (restaurant.socialLinks && Object.values(restaurant.socialLinks as any).some(Boolean))
      ? "You have social links set — added a Social footer column."
      : "No social links set yet — skipped the Social footer column.",
  };

  const navPlan: Decision<Array<{ id: string; label: string; type: string; value?: string }>> | null = hasCustomNav
    ? null
    : {
        reason: "No custom header menu set yet — added a standard Home/Shop/About/Contact menu.",
        value: [
          { id: "home", label: "Home", type: "home" },
          { id: "shop", label: "Shop", type: "shop" },
          { id: "about", label: "About Us", type: "page", value: "about-us" },
          { id: "contact", label: "Contact", type: "contact" },
        ],
      };

  return { vertical, tier, signals, palette, themeId: { value: themeId, reason: `A ${vertical.replace("-", " ")} store at a ${tier} price point matches this theme's layout and typography.` }, cardStyle, homepageLayout, newSections, collectionsToCreate, socialFooterGroup, navPlan };
}
