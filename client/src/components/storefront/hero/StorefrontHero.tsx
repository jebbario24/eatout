import { HeroClassic, type StorefrontHeroProps } from "./HeroClassic";
import { HeroEditorial } from "./HeroEditorial";
import { HeroFresh } from "./HeroFresh";
import { HeroWellness } from "./HeroWellness";
import type { StorefrontThemeId } from "@/lib/storefrontThemes";

export function StorefrontHero(props: StorefrontHeroProps & { themeId?: StorefrontThemeId | null }) {
  switch (props.themeId) {
    case "editorial":
      return <HeroEditorial {...props} />;
    case "fresh":
      return <HeroFresh {...props} />;
    case "wellness":
      return <HeroWellness {...props} />;
    default:
      return <HeroClassic {...props} />;
  }
}
