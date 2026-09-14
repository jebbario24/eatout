import type { MenuItem, CustomerReview, Restaurant, RestaurantThemeSettings, ThemeSection, ThemeSectionType } from "@shared/schema";

// The deterministic half of the store builder — every decision here is plain
// data/rules, no external calls, so the feature works with zero configuration.
// Every change carries a plain-English reason so "Optimize My Store" can show
// the merchant a real, grounded list of what happened and why.

export interface StoreBrief {
  businessName: string;
  industry: string; // grocery | pharmacy | flowers | retail
  targetAudience?: string;
  targetMarket?: string;
  stylePreference?: string; // e.g. "Luxury - Minimal - Elegant"
}

export interface StoreFacts {
  productCount: number;
  priceRange: { min: number; max: number } | null;
  hasCompareAtPrice: boolean;
  bestsellerTagCount: number;
  reviewCount: number;
  avgRating: number | null;
  hasLogo: boolean;
  hasProductImages: boolean;
}

export interface Palette {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface BlueprintChange {
  section: ThemeSectionType | "palette";
  description: string;
}

export interface StoreBlueprint {
  themeSettings: RestaurantThemeSettings;
  colors: Palette;
  collections: Array<{ title: string; handle: string; menuItemIds: string[] }>;
  facts: StoreFacts;
  changes: BlueprintChange[];
}

const STYLE_PRESETS: Record<string, Palette> = {
  "luxury": { primaryColor: "#1a1a1a", secondaryColor: "#f5f0e8", accentColor: "#c9a227" },
  "bold": { primaryColor: "#111111", secondaryColor: "#ffffff", accentColor: "#ff5a3c" },
  "natural": { primaryColor: "#3f3a34", secondaryColor: "#f7f3ee", accentColor: "#8a9a5b" },
  "fresh": { primaryColor: "#1f2937", secondaryColor: "#ffffff", accentColor: "#10b981" },
  "modern": { primaryColor: "#111111", secondaryColor: "#f5f5f5", accentColor: "#2563eb" },
};

export function resolvePalette(stylePreference?: string): Palette {
  const s = (stylePreference || "").toLowerCase();
  if (s.includes("luxury") || s.includes("elegant") || s.includes("minimal")) return STYLE_PRESETS.luxury;
  if (s.includes("bold") || s.includes("vibrant") || s.includes("street")) return STYLE_PRESETS.bold;
  if (s.includes("natural") || s.includes("organic") || s.includes("warm")) return STYLE_PRESETS.natural;
  if (s.includes("fresh") || s.includes("clean")) return STYLE_PRESETS.fresh;
  return STYLE_PRESETS.modern;
}

// Relative luminance contrast ratio (WCAG-style), used to catch an accent color
// that's too close to the background to read as a real "adjusted contrast" fix.
function luminance(hex: string): number {
  const rgb = hex.replace("#", "").match(/.{2}/g)?.map((h) => parseInt(h, 16) / 255) || [0, 0, 0];
  const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a) + 0.05;
  const l2 = luminance(b) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

function computeFacts(items: MenuItem[], reviews: CustomerReview[], restaurant: Restaurant): StoreFacts {
  const available = items.filter((i) => i.isAvailable && i.visibleOnline);
  const prices = available.map((i) => Number(i.priceCents || 0) / 100).filter((p) => p > 0);
  const goodReviews = reviews.filter((r) => r.isPublished && r.rating >= 4);
  const allRatings = reviews.filter((r) => r.isPublished).map((r) => r.rating);
  return {
    productCount: available.length,
    priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
    hasCompareAtPrice: available.some((i) => !!i.compareAtPrice),
    bestsellerTagCount: available.filter((i) => (i.tags || []).some((t) => /bestseller/i.test(t))).length,
    reviewCount: goodReviews.length,
    avgRating: allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : null,
    hasLogo: !!restaurant.logoUrl,
    hasProductImages: available.some((i) => !!i.imageUrl),
  };
}

function defaultSections(restaurant: Restaurant, facts: StoreFacts): ThemeSection[] {
  return [
    { type: "header", enabled: true, fields: { logoUrl: restaurant.logoUrl || null, nav: [{ label: "Home", type: "home" }, { label: "Shop", type: "shop" }, { label: "Contact", type: "contact" }], showSearch: true, showAccount: true, showCart: true } },
    { type: "hero", enabled: true, fields: { backgroundImageUrl: restaurant.coverImageUrl || null, heading: "", subheading: "", buttonText: "Shop Now", buttonStyle: "solid", textAlign: "left", overlayOpacity: 20 } },
    { type: "trustBadges", enabled: true, fields: { items: [
      { icon: "truck", label: "Free shipping", detail: "On all orders" },
      { icon: "refresh-cw", label: "Easy returns", detail: "Hassle-free" },
      { icon: "shield-check", label: "Secure payments", detail: "100% protected" },
      { icon: "headset", label: "24/7 support", detail: "We're here to help" },
    ] } },
    { type: "featuredProducts", enabled: facts.productCount > 0, fields: { collectionId: null, heading: "Featured Products", limit: 8 } },
    { type: "bestSellers", enabled: facts.bestsellerTagCount > 0, fields: { heading: "Best Sellers", limit: 4 } },
    { type: "banner", enabled: facts.productCount > 0, fields: { imageUrl: null, heading: "New Arrivals", buttonText: "Shop Now", buttonUrl: `/store/${restaurant.slug}/shop` } },
    { type: "aboutUs", enabled: true, fields: { heading: "About Us", body: "", imageUrl: restaurant.coverImageUrl || null } },
    { type: "testimonials", enabled: facts.reviewCount >= 3, fields: { heading: "What our customers say" } },
    { type: "newsletter", enabled: true, fields: { heading: "Join our newsletter", subheading: "Get updates on new products and offers" } },
    { type: "footer", enabled: true, fields: { showSocialLinks: !!(restaurant.socialLinks && Object.values(restaurant.socialLinks as any).some(Boolean)), showPaymentIcons: true } },
  ];
}

function findSection(sections: ThemeSection[], type: ThemeSectionType): ThemeSection | undefined {
  return sections.find((s) => s.type === type);
}

export interface BuildBlueprintInput {
  brief: StoreBrief;
  restaurant: Restaurant;
  items: MenuItem[];
  reviews: CustomerReview[];
  existingCollectionTitles: string[];
  /** Present only for "optimize" mode — the store's current live themeSettings. */
  current?: RestaurantThemeSettings | null;
}

export function buildBlueprint(input: BuildBlueprintInput): StoreBlueprint {
  const { brief, restaurant, items, reviews, existingCollectionTitles, current } = input;
  const facts = computeFacts(items, reviews, restaurant);
  const changes: BlueprintChange[] = [];

  let sections: ThemeSection[];
  if (current?.layout?.sections?.length) {
    // Optimize mode: start from what's live, never overwrite a field the merchant
    // already filled in — only enable sections that now qualify and fill blanks.
    sections = current.layout.sections.map((s) => ({ ...s, fields: { ...s.fields } }));
    const fresh = defaultSections(restaurant, facts);
    for (const freshSection of fresh) {
      const existing = findSection(sections, freshSection.type);
      if (!existing) {
        sections.push(freshSection);
        changes.push({ section: freshSection.type, description: `Added a ${freshSection.type} section.` });
        continue;
      }
      if (freshSection.type === "bestSellers" && !existing.enabled && facts.bestsellerTagCount > 0) {
        existing.enabled = true;
        changes.push({ section: "bestSellers", description: `Enabled Best Sellers — ${facts.bestsellerTagCount} product(s) are now tagged Bestseller.` });
      }
      if (freshSection.type === "testimonials" && !existing.enabled && facts.reviewCount >= 3) {
        existing.enabled = true;
        changes.push({ section: "testimonials", description: `Enabled Testimonials — you now have ${facts.reviewCount} published 4-5 star reviews.` });
      }
      if (freshSection.type === "hero" && !existing.fields.heading) {
        existing.fields.heading = "New heading pending copy"; // placeholder overwritten by copywriter
        changes.push({ section: "hero", description: "Filled in a missing hero headline." });
      }
      if (freshSection.type === "trustBadges" && (!existing.fields.items || existing.fields.items.length === 0)) {
        existing.fields.items = freshSection.fields.items;
        changes.push({ section: "trustBadges", description: "Added trust badges below the hero section." });
      }
    }
  } else {
    sections = defaultSections(restaurant, facts);
    changes.push({ section: "hero", description: "Generated an initial storefront layout." });
  }

  // Palette: reuse existing colors if already customized (optimize mode with real
  // colors already set); otherwise pick from the style-preference bank. Also fix a
  // genuinely too-low-contrast accent, a real, computable "improved readability" fix.
  let colors: Palette;
  if (current && restaurant.primaryColor && restaurant.secondaryColor && restaurant.accentColor) {
    colors = { primaryColor: restaurant.primaryColor, secondaryColor: restaurant.secondaryColor, accentColor: restaurant.accentColor };
    if (contrastRatio(colors.accentColor, colors.secondaryColor) < 2.2) {
      const suggestion = resolvePalette(brief.stylePreference);
      colors = { ...colors, accentColor: suggestion.accentColor };
      changes.push({ section: "palette", description: "Adjusted your accent color for better contrast and readability." });
    }
  } else {
    colors = resolvePalette(brief.stylePreference);
  }

  // Collections: an auto "Featured" collection seeded from newest available items,
  // only created if one doesn't already exist under that title.
  const collections: StoreBlueprint["collections"] = [];
  const available = items.filter((i) => i.isAvailable && i.visibleOnline);
  if (available.length > 0 && !existingCollectionTitles.includes("Featured")) {
    const newest = [...available].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    collections.push({ title: "Featured", handle: "featured", menuItemIds: newest.slice(0, 12).map((i) => i.id) });
  }

  return {
    themeSettings: { version: 1, layout: { sections }, meta: { lastPublishedAt: null, brandStyle: brief.stylePreference || null } },
    colors,
    collections,
    facts,
    changes,
  };
}
