import type { CSSProperties } from "react";

// Restaurant brand colors are stored as hex; the app's design tokens (used by
// every shadcn component the storefront reuses, e.g. Button's bg-primary) are
// HSL triplet strings like "220 90% 50%" with no hsl()/commas. Converting and
// overriding --primary/--secondary/--accent (+ their -foreground pairs) on the
// storefront root is what makes a merchant's chosen colors actually show up —
// -border variants recompute automatically from these via the app's own CSS.
function hexToHslTriplet(hex: string): string | null {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : l > 0.5 ? d / (2 - max - min) : d / (max + min);
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function readableForegroundHsl(hex: string): string {
  const clean = hex.replace("#", "").trim();
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "0 0% 10%" : "0 0% 100%";
}

export interface StorefrontColors {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
}

export function storefrontColorVars(colors: StorefrontColors): CSSProperties {
  const vars: Record<string, string> = {};
  (["primaryColor", "secondaryColor", "accentColor"] as const).forEach((key) => {
    const hex = colors[key];
    if (!hex) return;
    const hsl = hexToHslTriplet(hex);
    if (!hsl) return;
    const varName = key.replace("Color", "");
    vars[`--${varName}`] = hsl;
    vars[`--${varName}-foreground`] = readableForegroundHsl(hex);
  });
  return vars as CSSProperties;
}
