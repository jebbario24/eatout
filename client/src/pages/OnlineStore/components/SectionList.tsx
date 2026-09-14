import { Palette, Layout, Image as ImageIcon, ShieldCheck, Grid3x3, Star, Megaphone, Users, Mail, PanelBottom } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { ThemeSection, ThemeSectionType } from "@shared/schema";

const SECTION_META: Record<ThemeSectionType, { label: string; icon: typeof Layout }> = {
  header: { label: "Header", icon: Layout },
  hero: { label: "Hero Section", icon: ImageIcon },
  trustBadges: { label: "Trust Badges", icon: ShieldCheck },
  featuredProducts: { label: "Featured Products", icon: Grid3x3 },
  bestSellers: { label: "Best Sellers", icon: Star },
  banner: { label: "Banner", icon: Megaphone },
  aboutUs: { label: "About Us", icon: Users },
  testimonials: { label: "Testimonials", icon: Star },
  newsletter: { label: "Newsletter", icon: Mail },
  footer: { label: "Footer", icon: PanelBottom },
};

const LOCKED: ThemeSectionType[] = ["header", "footer"];

export function SectionList({ sections, selectedKey, onSelect, onToggle, testimonialsEligible, bestSellersEligible }: {
  sections: ThemeSection[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onToggle: (type: ThemeSectionType, enabled: boolean) => void;
  testimonialsEligible: boolean;
  bestSellersEligible: boolean;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <button
        onClick={() => onSelect("design")}
        className={`flex items-center gap-2.5 border-b px-4 py-3 text-left text-sm font-medium ${selectedKey === "design" ? "bg-accent" : "hover:bg-accent/50"}`}
        data-testid="button-section-design"
      >
        <Palette className="h-4 w-4 text-primary" />
        Design &amp; Colors
      </button>
      <div className="flex-1 py-1">
        {sections.map((section) => {
          const meta = SECTION_META[section.type];
          if (!meta) return null;
          const Icon = meta.icon;
          const locked = LOCKED.includes(section.type);
          const hint = section.type === "testimonials" && !testimonialsEligible
            ? "Hidden until 3+ reviews rated 4-5★"
            : section.type === "bestSellers" && !bestSellersEligible
            ? "Hidden until a product is tagged Bestseller"
            : null;
          return (
            <div
              key={section.type}
              className={`flex items-center gap-2.5 px-4 py-2.5 ${selectedKey === section.type ? "bg-accent" : "hover:bg-accent/50"} ${!section.enabled ? "opacity-50" : ""}`}
            >
              <button className="flex flex-1 items-center gap-2.5 text-left" onClick={() => onSelect(section.type)} data-testid={`button-section-${section.type}`}>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{meta.label}</p>
                  {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
                </div>
              </button>
              {!locked && (
                <Switch
                  checked={section.enabled}
                  onCheckedChange={(checked) => onToggle(section.type, checked)}
                  data-testid={`switch-section-${section.type}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
