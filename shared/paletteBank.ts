// Curated per-vertical/tier color palettes for the AI store builder. No
// image-processing dependency exists in this repo, so instead of extracting a
// dominant color from an uploaded logo, the engine picks from this small,
// hand-picked bank — still a real, data-driven decision (keyed off the
// detected vertical + tier), just not literal pixel analysis.
export interface Palette {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export type StoreVertical =
  | "luxury-fashion"
  | "streetwear"
  | "electronics"
  | "beauty"
  | "wellness"
  | "home-decor"
  | "grocery"
  | "pharmacy"
  | "flowers"
  | "general-retail";

export type StoreTier = "budget" | "mid" | "premium" | "luxury";

const BANK: Record<StoreVertical, Record<StoreTier, Palette>> = {
  "luxury-fashion": {
    budget: { primaryColor: "#1a1a1a", secondaryColor: "#6b6b6b", accentColor: "#c9a15a" },
    mid: { primaryColor: "#161616", secondaryColor: "#5c5c5c", accentColor: "#b08d57" },
    premium: { primaryColor: "#0f0f0f", secondaryColor: "#4a4a4a", accentColor: "#c9a15a" },
    luxury: { primaryColor: "#0a0a0a", secondaryColor: "#3d3d3d", accentColor: "#d4af37" },
  },
  streetwear: {
    budget: { primaryColor: "#111111", secondaryColor: "#555555", accentColor: "#e8ff3d" },
    mid: { primaryColor: "#0d0d0d", secondaryColor: "#4d4d4d", accentColor: "#cbff3d" },
    premium: { primaryColor: "#0a0a0a", secondaryColor: "#454545", accentColor: "#b3ff00" },
    luxury: { primaryColor: "#000000", secondaryColor: "#3a3a3a", accentColor: "#d4ff4d" },
  },
  electronics: {
    budget: { primaryColor: "#14181f", secondaryColor: "#5a6472", accentColor: "#3b82f6" },
    mid: { primaryColor: "#101319", secondaryColor: "#525a66", accentColor: "#2563eb" },
    premium: { primaryColor: "#0c0e12", secondaryColor: "#454c56", accentColor: "#0ea5e9" },
    luxury: { primaryColor: "#08090b", secondaryColor: "#3a4048", accentColor: "#38bdf8" },
  },
  beauty: {
    budget: { primaryColor: "#2b1e1e", secondaryColor: "#8a6f6f", accentColor: "#e8a5a5" },
    mid: { primaryColor: "#241a1a", secondaryColor: "#7c6363", accentColor: "#e08e8e" },
    premium: { primaryColor: "#1f1616", secondaryColor: "#6e5757", accentColor: "#d97a7a" },
    luxury: { primaryColor: "#180f0f", secondaryColor: "#5c4747", accentColor: "#c96a6a" },
  },
  wellness: {
    budget: { primaryColor: "#1e2620", secondaryColor: "#6b7d6e", accentColor: "#9fc9a4" },
    mid: { primaryColor: "#1a211c", secondaryColor: "#5f7062", accentColor: "#8fbf95" },
    premium: { primaryColor: "#161d18", secondaryColor: "#546455", accentColor: "#7cb086" },
    luxury: { primaryColor: "#11160f", secondaryColor: "#485749", accentColor: "#6ca378" },
  },
  "home-decor": {
    budget: { primaryColor: "#221f1c", secondaryColor: "#867a6d", accentColor: "#d4a373" },
    mid: { primaryColor: "#1c1a17", secondaryColor: "#786d61", accentColor: "#c8946a" },
    premium: { primaryColor: "#17150f", secondaryColor: "#6a5f52", accentColor: "#b9885f" },
    luxury: { primaryColor: "#120f0c", secondaryColor: "#584d42", accentColor: "#a97c56" },
  },
  grocery: {
    budget: { primaryColor: "#1c2418", secondaryColor: "#5c6b53", accentColor: "#7cb342" },
    mid: { primaryColor: "#182015", secondaryColor: "#52604a", accentColor: "#6ba33b" },
    premium: { primaryColor: "#141a11", secondaryColor: "#495640", accentColor: "#5c9134" },
    luxury: { primaryColor: "#0f130d", secondaryColor: "#3d4837", accentColor: "#4f7d2c" },
  },
  pharmacy: {
    budget: { primaryColor: "#141a24", secondaryColor: "#546174", accentColor: "#2fa8b0" },
    mid: { primaryColor: "#111620", secondaryColor: "#4b5768", accentColor: "#2a97a0" },
    premium: { primaryColor: "#0e131b", secondaryColor: "#424c5b", accentColor: "#24868f" },
    luxury: { primaryColor: "#0a0e15", secondaryColor: "#374151", accentColor: "#1f757e" },
  },
  flowers: {
    budget: { primaryColor: "#241a20", secondaryColor: "#8a6e78", accentColor: "#e0879e" },
    mid: { primaryColor: "#1e1519", secondaryColor: "#7b606a", accentColor: "#d5758d" },
    premium: { primaryColor: "#191215", secondaryColor: "#6c525c", accentColor: "#c8657e" },
    luxury: { primaryColor: "#130d10", secondaryColor: "#5a434b", accentColor: "#b8546d" },
  },
  "general-retail": {
    budget: { primaryColor: "#18181b", secondaryColor: "#6b6b70", accentColor: "#f97316" },
    mid: { primaryColor: "#151517", secondaryColor: "#5f5f64", accentColor: "#ea580c" },
    premium: { primaryColor: "#111113", secondaryColor: "#525257", accentColor: "#c2410c" },
    luxury: { primaryColor: "#0a0a0b", secondaryColor: "#3f3f45", accentColor: "#9a3412" },
  },
};

export function pickPalette(vertical: StoreVertical, tier: StoreTier): Palette {
  return BANK[vertical]?.[tier] || BANK["general-retail"].mid;
}
