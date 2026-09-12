export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  cardStyle: "standard" | "bordered";
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "classic",
    name: "Classic",
    description: "The original EatOut palette with boxed, bordered product cards — the safe, familiar starting point.",
    primaryColor: "#F97316",
    secondaryColor: "#FB923C",
    accentColor: "#FDBA74",
    cardStyle: "bordered",
  },
  {
    id: "fresh-modern",
    name: "Fresh & Modern",
    description: "Crisp greens with borderless, image-first cards — for health-forward, farm-to-table, and casual dining brands.",
    primaryColor: "#16A34A",
    secondaryColor: "#4ADE80",
    accentColor: "#DCFCE7",
    cardStyle: "standard",
  },
  {
    id: "bold-bright",
    name: "Bold & Bright",
    description: "High-energy orange and red — for fast-food, street food, and delivery-first brands that want to pop.",
    primaryColor: "#DC2626",
    secondaryColor: "#F97316",
    accentColor: "#FFEDD5",
    cardStyle: "standard",
  },
  {
    id: "midnight-premium",
    name: "Midnight Premium",
    description: "Near-black buttons with a muted gold accent and editorial, whitespace-driven cards — for fine dining and upscale brands.",
    primaryColor: "#171717",
    secondaryColor: "#A16207",
    accentColor: "#FEF3C7",
    cardStyle: "standard",
  },
  {
    id: "minimal-monochrome",
    name: "Minimal & Monochrome",
    description: "Grayscale palette with clean bordered cards — a quiet, minimalist look that lets food photography do the talking.",
    primaryColor: "#27272A",
    secondaryColor: "#71717A",
    accentColor: "#F4F4F5",
    cardStyle: "bordered",
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    description: "Cool, trustworthy blues with borderless cards — a fit for cafes, seafood, and health/wellness brands.",
    primaryColor: "#0284C7",
    secondaryColor: "#38BDF8",
    accentColor: "#E0F2FE",
    cardStyle: "standard",
  },
];

export function matchPreset(restaurant: { primaryColor?: string | null; secondaryColor?: string | null; accentColor?: string | null }): ThemePreset | null {
  const norm = (v?: string | null) => (v || "").toLowerCase();
  return (
    THEME_PRESETS.find(
      (p) =>
        norm(restaurant.primaryColor) === p.primaryColor.toLowerCase() &&
        norm(restaurant.secondaryColor) === p.secondaryColor.toLowerCase() &&
        norm(restaurant.accentColor) === p.accentColor.toLowerCase()
    ) || null
  );
}
