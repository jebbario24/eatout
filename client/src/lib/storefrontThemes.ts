export type StorefrontThemeId = "editorial" | "fresh" | "wellness";

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
    description: "Full-bleed photography, serif headlines, and a scrolling marquee — an editorial, fashion-forward look.",
    primaryColor: "#171412",
    secondaryColor: "#3a3532",
    accentColor: "#c9a876",
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
];

export function getStorefrontTheme(themeId: string | null | undefined): StorefrontThemeDef | null {
  return STOREFRONT_THEMES.find((t) => t.id === themeId) || null;
}
