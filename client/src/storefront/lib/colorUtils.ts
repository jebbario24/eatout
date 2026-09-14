import type { CSSProperties } from "react";
import type { StorefrontThemeId } from "@shared/schema";

export interface StorefrontColors {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
}

// Each storefront theme is a fixed, achromatic token set — the merchant's own
// primaryColor/secondaryColor/accentColor never feed the storefront (product
// photography is meant to carry all the color), so `_colors` is accepted only
// so call sites don't need to change and is otherwise ignored.
const THEME_TOKENS: Record<StorefrontThemeId, CSSProperties> = {
  farfetch: {
    "--background": "0 0% 100%", // Paper
    "--foreground": "0 0% 13%", // Carbon
    "--card": "0 0% 100%",
    "--card-foreground": "0 0% 13%",
    "--card-border": "0 0% 90%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "0 0% 13%",
    "--primary": "0 0% 13%",
    "--primary-foreground": "0 0% 100%",
    "--secondary": "0 0% 96%", // Stone
    "--secondary-foreground": "0 0% 13%",
    "--muted": "0 0% 96%", // Stone
    "--muted-foreground": "0 0% 45%", // Graphite
    "--accent": "0 0% 96%", // Stone hover wash
    "--accent-foreground": "0 0% 13%",
    "--border": "0 0% 90%", // Smoke
    "--input": "0 0% 90%",
    "--ring": "0 0% 13%",
  } as CSSProperties,
  adanola: {
    "--background": "0 0% 100%", // Paper White
    "--foreground": "0 0% 0%", // Carbon Ink
    "--card": "0 0% 100%",
    "--card-foreground": "0 0% 0%",
    "--card-border": "220 13% 91%", // Soft Mist
    "--popover": "0 0% 100%",
    "--popover-foreground": "0 0% 0%",
    "--primary": "0 0% 0%",
    "--primary-foreground": "0 0% 100%",
    "--secondary": "220 13% 91%", // Soft Mist
    "--secondary-foreground": "0 0% 0%",
    "--muted": "48 19% 93%", // Warm Fog
    "--muted-foreground": "0 0% 20%", // Smoke Charcoal
    "--accent": "220 13% 91%", // Soft Mist hover wash
    "--accent-foreground": "0 0% 0%",
    "--border": "0 0% 0%", // Carbon Ink hairline
    "--input": "0 0% 20%", // Smoke Charcoal
    "--ring": "0 0% 0%",
  } as CSSProperties,
  // Maison — the one storefront theme that isn't achromatic on purpose: a
  // warm, romantic fashion palette (cream canvas, dusty-rose accent, tan
  // surfaces) lifted from a real installed Shopify theme's own color_schemes,
  // paired with its actual type choice (Playfair Display headers / Lora body).
  maison: {
    "--background": "45 40% 96%", // Cream
    "--foreground": "0 0% 20%", // Soft ink
    "--card": "0 0% 100%",
    "--card-foreground": "0 0% 20%",
    "--card-border": "30 20% 87%", // Soft tan hairline
    "--popover": "0 0% 100%",
    "--popover-foreground": "0 0% 20%",
    "--primary": "0 37% 71%", // Dusty rose
    "--primary-foreground": "0 0% 100%",
    "--secondary": "30 37% 84%", // Tan
    "--secondary-foreground": "0 0% 17%",
    "--muted": "35 30% 94%", // Warm cream tint
    "--muted-foreground": "20 8% 45%",
    "--accent": "0 37% 92%", // Rose hover wash
    "--accent-foreground": "0 0% 20%",
    "--border": "30 20% 87%",
    "--input": "30 20% 87%",
    "--ring": "0 37% 71%",
  } as CSSProperties,
};

export function storefrontColorVars(theme: StorefrontThemeId = "farfetch", _colors?: StorefrontColors): CSSProperties {
  return THEME_TOKENS[theme] || THEME_TOKENS.farfetch;
}
