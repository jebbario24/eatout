import type { MerchantThemeSettings } from "@shared/schema";

// A merchant can carry a `themeSettings` value left over from an older,
// now-deleted store builder with a different JSON shape — truthy, but not a
// MerchantThemeSettings. Treat anything that doesn't match the current
// shape as "not set up yet" rather than crashing on a missing `.layout.sections`.
export function hasValidThemeSettings(ts: unknown): ts is MerchantThemeSettings {
  return !!ts && typeof ts === "object" && Array.isArray((ts as any)?.layout?.sections);
}
