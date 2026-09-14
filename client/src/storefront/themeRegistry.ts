import type { StorefrontThemeId } from "@shared/schema";

import { Header as FarfetchHeader } from "@/storefront/components/Header";
import { Hero as FarfetchHero } from "@/storefront/components/Hero";
import { TrustBadges as FarfetchTrustBadges } from "@/storefront/components/TrustBadges";
import { ProductGrid as FarfetchProductGrid } from "@/storefront/components/ProductGrid";
import { Banner as FarfetchBanner } from "@/storefront/components/Banner";
import { AboutUs as FarfetchAboutUs } from "@/storefront/components/AboutUs";
import { Testimonials as FarfetchTestimonials } from "@/storefront/components/Testimonials";
import { Newsletter as FarfetchNewsletter } from "@/storefront/components/Newsletter";
import { Footer as FarfetchFooter } from "@/storefront/components/Footer";

import { Header as AdanolaHeader } from "@/storefront/themes/adanola/Header";
import { Hero as AdanolaHero } from "@/storefront/themes/adanola/Hero";
import { TrustBadges as AdanolaTrustBadges } from "@/storefront/themes/adanola/TrustBadges";
import { ProductGrid as AdanolaProductGrid } from "@/storefront/themes/adanola/ProductGrid";
import { Banner as AdanolaBanner } from "@/storefront/themes/adanola/Banner";
import { AboutUs as AdanolaAboutUs } from "@/storefront/themes/adanola/AboutUs";
import { Testimonials as AdanolaTestimonials } from "@/storefront/themes/adanola/Testimonials";
import { Newsletter as AdanolaNewsletter } from "@/storefront/themes/adanola/Newsletter";
import { Footer as AdanolaFooter } from "@/storefront/themes/adanola/Footer";

// One entry per storefront theme's full section-component set. Every entry
// implements the exact same props contract (Header/Hero/etc. field types
// defined once in `storefront/components/*`), so a page only needs to pick
// which set to render from — the section data model (ThemeSection, fields)
// never changes per theme.
export const STOREFRONT_THEMES = {
  farfetch: {
    Header: FarfetchHeader,
    Hero: FarfetchHero,
    TrustBadges: FarfetchTrustBadges,
    ProductGrid: FarfetchProductGrid,
    Banner: FarfetchBanner,
    AboutUs: FarfetchAboutUs,
    Testimonials: FarfetchTestimonials,
    Newsletter: FarfetchNewsletter,
    Footer: FarfetchFooter,
  },
  adanola: {
    Header: AdanolaHeader,
    Hero: AdanolaHero,
    TrustBadges: AdanolaTrustBadges,
    ProductGrid: AdanolaProductGrid,
    Banner: AdanolaBanner,
    AboutUs: AdanolaAboutUs,
    Testimonials: AdanolaTestimonials,
    Newsletter: AdanolaNewsletter,
    Footer: AdanolaFooter,
  },
} satisfies Record<StorefrontThemeId, unknown>;

export function resolveTheme(id: StorefrontThemeId | null | undefined): StorefrontThemeId {
  return id === "adanola" ? "adanola" : "farfetch";
}
