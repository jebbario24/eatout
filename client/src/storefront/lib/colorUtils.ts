import type { CSSProperties } from "react";

export interface StorefrontColors {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
}

// The storefront's visual identity is a fixed achromatic "white gallery" look
// (Farfetch-style: editorial photography carries every color, the interface
// never does) rather than each merchant's chosen brand colors, so this always
// returns the same token set — the `colors` argument is accepted only so
// existing call sites don't need to change and is otherwise ignored.
export function storefrontColorVars(_colors?: StorefrontColors): CSSProperties {
  return {
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
  } as CSSProperties;
}
