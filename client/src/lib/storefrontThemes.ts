export type StorefrontThemeId = "editorial" | "fresh" | "wellness" | "nova";

export interface StorefrontThemeDef {
  id: StorefrontThemeId;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  cardStyle: "standard" | "bordered";
}

export const STOREFRONT_THEMES: StorefrontThemeDef[] = [
  {
    id: "editorial",
    name: "Atelier",
    description: "Cream backdrop, serif headlines, and dusty-rose accents — a soft, boutique-fashion look.",
    primaryColor: "#b5677d",
    secondaryColor: "#e8c3ca",
    accentColor: "#f3e0d3",
    cardStyle: "standard",
  },
  {
    id: "fresh",
    name: "Harvest",
    description: "Warm, friendly, and rounded — a category grid and badge-forward cards suited to fresh goods.",
    primaryColor: "#2f5233",
    secondaryColor: "#6b9b6e",
    accentColor: "#e8a33d",
    cardStyle: "bordered",
  },
  {
    id: "wellness",
    name: "Still",
    description: "A calm split-screen hero and tabbed best-sellers, in a soft sage-and-cream palette.",
    primaryColor: "#4a5d43",
    secondaryColor: "#a8b89a",
    accentColor: "#d9cdb8",
    cardStyle: "bordered",
  },
  {
    id: "nova",
    name: "Nova",
    description: "Full-bleed photography, ultra-light type, and a technical mono accent — a sharp, tech-forward look.",
    primaryColor: "#0a0a0a",
    secondaryColor: "#6b6b6b",
    accentColor: "#cbff3d",
    cardStyle: "standard",
  },
];

export function getStorefrontTheme(themeId: string | null | undefined): StorefrontThemeDef | null {
  return STOREFRONT_THEMES.find((t) => t.id === themeId) || null;
}
