import type { RestaurantThemeSettings } from "@shared/schema";

// A restaurant can carry a `themeSettings` value left over from an older,
// now-deleted store builder with a different JSON shape — truthy, but not a
// RestaurantThemeSettings. Treat anything that doesn't match the current
// shape as "not set up yet" rather than crashing on a missing `.layout.sections`.
export function hasValidThemeSettings(ts: unknown): ts is RestaurantThemeSettings {
  return !!ts && typeof ts === "object" && Array.isArray((ts as any)?.layout?.sections);
}
