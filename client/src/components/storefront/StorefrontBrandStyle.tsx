import type { Restaurant } from "@shared/schema";

// Convert a hex color to an "H S% L%" triple (no hsl() wrapper) — the format
// shadcn/Tailwind CSS custom properties expect (e.g. `--primary: 160 100% 25%`).
function hexToHSL(hex: string): string {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Best foreground (black or white) for WCAG AA contrast (4.5:1) against a hex bg.
function getForegroundFromHex(hex: string): string {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const bgLuminance = getLuminance(r, g, b);
  const whiteContrast = getContrastRatio(1, bgLuminance);
  const blackContrast = getContrastRatio(bgLuminance, 0);

  return whiteContrast >= blackContrast ? '0 0% 100%' : '0 0% 10%';
}

export interface StorefrontBrandStyleProps {
  restaurant: Pick<Restaurant, "primaryColor" | "secondaryColor" | "accentColor"> | null | undefined;
  themeId?: string | null;
}

// Injects the merchant's custom brand colors as CSS custom properties, plus any
// per-theme overrides (e.g. Atelier's cream page background). Shared by every
// storefront-family page (main storefront, product page, shop page) so a
// merchant's colors and active theme look consistent no matter which page a
// visitor lands on.
export function StorefrontBrandStyle({ restaurant, themeId }: StorefrontBrandStyleProps) {
  if (!restaurant || !(restaurant.primaryColor || restaurant.secondaryColor || restaurant.accentColor)) {
    return null;
  }

  const primaryHex = restaurant.primaryColor || '#f97316';
  const secondaryHex = restaurant.secondaryColor || '#fb923c';
  const accentHex = restaurant.accentColor || '#fdba74';

  return (
    <style>{`
      :root {
        --primary: ${hexToHSL(primaryHex)};
        --primary-foreground: ${getForegroundFromHex(primaryHex)};
        --secondary: ${hexToHSL(secondaryHex)};
        --secondary-foreground: ${getForegroundFromHex(secondaryHex)};
        --accent: ${hexToHSL(accentHex)};
        --accent-foreground: ${getForegroundFromHex(accentHex)};
        --ring: ${hexToHSL(primaryHex)};
        ${themeId === "editorial" ? "--background: 27 60% 97%;" : ""}
      }
    `}</style>
  );
}
