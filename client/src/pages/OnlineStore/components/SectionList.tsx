import { Palette, Layout, Image as ImageIcon, ShieldCheck, Grid3x3, Star, Megaphone, Users, Mail, PanelBottom, Code2, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
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
  customEmbed: { label: "Custom HTML", icon: Code2 },
};

const LOCKED: ThemeSectionType[] = ["header", "footer"];

const sectionKey = (s: ThemeSection) => s.id || s.type;

export function SectionList({ sections, selectedKey, onSelect, onToggle, onAddEmbed, onRemove, onMove, testimonialsEligible, bestSellersEligible }: {
  sections: ThemeSection[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onToggle: (key: string, enabled: boolean) => void;
  onAddEmbed: () => void;
  onRemove: (key: string) => void;
  onMove: (key: string, direction: "up" | "down") => void;
  testimonialsEligible: boolean;
  bestSellersEligible: boolean;
}) {
  // Header/footer are rendered in their own fixed slots regardless of array
  // position, so only the sections between them are meaningfully reorderable.
  const bodySections = sections.filter((s) => s.type !== "header" && s.type !== "footer");

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

      {sections.filter((s) => s.type === "header").map((section) => {
        const meta = SECTION_META[section.type];
        const Icon = meta.icon;
        const key = sectionKey(section);
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex items-center gap-2.5 border-b px-4 py-2.5 text-left ${selectedKey === key ? "bg-accent" : "hover:bg-accent/50"}`}
            data-testid={`button-section-${key}`}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm font-medium">{meta.label}</p>
          </button>
        );
      })}

      <div className="flex-1 py-1">
        {bodySections.map((section, i) => {
          const meta = SECTION_META[section.type];
          if (!meta) return null;
          const Icon = meta.icon;
          const key = sectionKey(section);
          const removable = section.type === "customEmbed";
          const hint = section.type === "testimonials" && !testimonialsEligible
            ? "Hidden until 3+ reviews rated 4-5★"
            : section.type === "bestSellers" && !bestSellersEligible
            ? "Hidden until a product is tagged Bestseller"
            : null;
          return (
            <div
              key={key}
              className={`group flex items-center gap-1 px-2 py-1.5 ${selectedKey === key ? "bg-accent" : "hover:bg-accent/50"} ${!section.enabled ? "opacity-50" : ""}`}
            >
              <div className="flex shrink-0 flex-col">
                <button
                  className="flex h-3.5 w-4 items-center justify-center text-muted-foreground disabled:opacity-20"
                  onClick={() => onMove(key, "up")}
                  disabled={i === 0}
                  aria-label="Move up"
                  data-testid={`button-move-up-${key}`}
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  className="flex h-3.5 w-4 items-center justify-center text-muted-foreground disabled:opacity-20"
                  onClick={() => onMove(key, "down")}
                  disabled={i === bodySections.length - 1}
                  aria-label="Move down"
                  data-testid={`button-move-down-${key}`}
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <button className="flex flex-1 items-center gap-2.5 py-1 text-left" onClick={() => onSelect(key)} data-testid={`button-section-${key}`}>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{meta.label}</p>
                  {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
                </div>
              </button>
              {!LOCKED.includes(section.type) && (
                <Switch
                  checked={section.enabled}
                  onCheckedChange={(checked) => onToggle(key, checked)}
                  data-testid={`switch-section-${key}`}
                />
              )}
              {removable && (
                <button
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={() => { if (window.confirm("Remove this section?")) onRemove(key); }}
                  aria-label="Remove section"
                  data-testid={`button-remove-${key}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={onAddEmbed}
          className="mt-1 flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-primary hover:bg-accent/50"
          data-testid="button-add-section"
        >
          <Plus className="h-4 w-4" />
          Add custom HTML section
        </button>
      </div>

      {sections.filter((s) => s.type === "footer").map((section) => {
        const meta = SECTION_META[section.type];
        const Icon = meta.icon;
        const key = sectionKey(section);
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex items-center gap-2.5 border-t px-4 py-2.5 text-left ${selectedKey === key ? "bg-accent" : "hover:bg-accent/50"}`}
            data-testid={`button-section-${key}`}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm font-medium">{meta.label}</p>
          </button>
        );
      })}
    </div>
  );
}
