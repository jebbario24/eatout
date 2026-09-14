import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Restaurant, RestaurantThemeSettings, ThemeSection, ThemeSectionType, CustomerReview, MenuItem, StorefrontThemeId } from "@shared/schema";
import { SectionList } from "./components/SectionList";
import { FieldPanel } from "./components/FieldPanel";
import { DeviceSwitcher, DEVICE_WIDTHS, type DeviceMode } from "./components/DeviceSwitcher";
import { hasValidThemeSettings } from "@/storefront/lib/themeSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Starter fields for a freshly-added instance of each type — same shape
// `storeIntelligence.ts` uses for the AI-generated originals, just generic
// copy instead of business-specific content the merchant hasn't given yet.
const SECTION_DEFAULTS: Record<Exclude<ThemeSectionType, "header" | "footer">, Record<string, any>> = {
  hero: { backgroundImageUrl: null, secondaryImageUrl: null, heading: "New heading", subheading: "", buttonText: "Shop Now", buttonStyle: "solid", textAlign: "left", overlayOpacity: 20 },
  trustBadges: { items: [{ icon: "truck", label: "Free shipping", detail: "On all orders" }] },
  featuredProducts: { collectionHandle: null, heading: "Featured Products", limit: 8 },
  bestSellers: { heading: "Best Sellers", limit: 4 },
  banner: { imageUrl: null, heading: "New banner", buttonText: "", buttonUrl: "" },
  aboutUs: { heading: "About Us", body: "", imageUrl: null },
  testimonials: { heading: "What our customers say" },
  newsletter: { heading: "Join our newsletter", subheading: "" },
  customEmbed: { html: "", fullBleed: false },
};

export default function StoreEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedKey, setSelectedKey] = useState<string>("hero");
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [themeSettings, setThemeSettings] = useState<RestaurantThemeSettings | null>(null);
  const [socialLinks, setSocialLinks] = useState<Record<string, string> | null>(null);
  const [isSaving, setIsSaving] = useState<"save" | "publish" | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  const { data: restaurant, isLoading } = useQuery<Restaurant | null>({ queryKey: ["/api/restaurants/me"] });
  const { data: reviews = [] } = useQuery<CustomerReview[]>({ queryKey: ["/api/reviews"] });
  const { data: items = [] } = useQuery<MenuItem[]>({ queryKey: ["/api/menu/items"] });

  useEffect(() => {
    if (restaurant && !themeSettings) {
      setThemeSettings(hasValidThemeSettings(restaurant.themeSettings) ? restaurant.themeSettings : null);
      setSocialLinks((restaurant.socialLinks as Record<string, string>) || {});
    }
  }, [restaurant, themeSettings]);

  const postDraft = () => {
    if (!iframeRef.current?.contentWindow || !themeSettings) return;
    iframeRef.current.contentWindow.postMessage({ type: "STOREFRONT_DRAFT_UPDATE", themeSettings }, window.location.origin);
  };

  useEffect(() => {
    if (iframeReady) postDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeSettings, iframeReady]);

  if (isLoading || !restaurant) {
    return <div className="flex h-full min-h-[70vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!themeSettings) {
    return (
      <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold">Your online store hasn't been generated yet.</p>
        <Button onClick={() => { window.location.href = "/online-store"; }}>Set up your store</Button>
      </div>
    );
  }

  const sections = themeSettings.layout.sections;
  const sectionKey = (s: ThemeSection) => s.id || s.type;
  const activeSection = sections.find((s) => sectionKey(s) === selectedKey);
  const testimonialsEligible = reviews.filter((r) => r.isPublished && r.rating >= 4).length >= 3;
  const bestSellersEligible = items.some((i: any) => i.isAvailable && i.visibleOnline && (i.tags || []).some((t: string) => /bestseller/i.test(t)));

  const updateSections = (next: typeof sections) => {
    setThemeSettings((prev) => (prev ? { ...prev, layout: { ...prev.layout, sections: next } } : prev));
  };

  const handleToggle = (key: string, enabled: boolean) => {
    updateSections(sections.map((s) => (sectionKey(s) === key ? { ...s, enabled } : s)));
  };

  const handleFieldsChange = (key: string, fields: Record<string, any>) => {
    updateSections(sections.map((s) => (sectionKey(s) === key ? { ...s, fields } : s)));
  };

  const handleThemeChange = (theme: StorefrontThemeId) => {
    setThemeSettings((prev) => (prev ? { ...prev, theme } : prev));
  };

  const handleAddSection = (type: ThemeSectionType) => {
    const id = `${type}-${crypto.randomUUID()}`;
    const footerIndex = sections.findIndex((s) => s.type === "footer");
    const newSection: ThemeSection = { id, type, enabled: true, fields: { ...SECTION_DEFAULTS[type as Exclude<ThemeSectionType, "header" | "footer">] } };
    const next = [...sections];
    if (footerIndex === -1) next.push(newSection);
    else next.splice(footerIndex, 0, newSection);
    updateSections(next);
    setSelectedKey(id);
  };

  const handleRemove = (key: string) => {
    updateSections(sections.filter((s) => sectionKey(s) !== key));
    if (selectedKey === key) setSelectedKey("hero");
  };

  const handleMove = (key: string, direction: "up" | "down") => {
    const bodyTypes = sections.filter((s) => s.type !== "header" && s.type !== "footer");
    const from = bodyTypes.findIndex((s) => sectionKey(s) === key);
    const to = direction === "up" ? from - 1 : from + 1;
    if (from === -1 || to < 0 || to >= bodyTypes.length) return;
    const reordered = [...bodyTypes];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    const header = sections.find((s) => s.type === "header");
    const footer = sections.find((s) => s.type === "footer");
    updateSections([...(header ? [header] : []), ...reordered, ...(footer ? [footer] : [])]);
  };

  const save = async (publish: boolean) => {
    if (!themeSettings || !socialLinks) return;
    setIsSaving(publish ? "publish" : "save");
    try {
      await apiRequest("/api/store/theme", "PATCH", { themeSettings, socialLinks, publish });
      await queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: publish ? "Your store is live" : "Draft saved" });
    } catch {
      toast({ variant: "destructive", title: "Failed to save", description: "Please try again." });
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { window.location.href = "/online-store"; }}
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="font-semibold">Store Editor</p>
          <Select value={themeSettings.theme || "farfetch"} onValueChange={(v) => handleThemeChange(v as StorefrontThemeId)}>
            <SelectTrigger className="h-8 w-36" data-testid="select-storefront-theme"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="farfetch">Farfetch</SelectItem>
              <SelectItem value="adanola">Adanola</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DeviceSwitcher mode={device} onChange={setDevice} />
        <div className="flex items-center gap-2">
          <a href={`/store/${restaurant.slug}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />View store</Button>
          </a>
          <Button variant="outline" size="sm" disabled={isSaving !== null} onClick={() => save(false)} data-testid="button-save-draft">
            {isSaving === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </Button>
          <Button size="sm" disabled={isSaving !== null} onClick={() => save(true)} data-testid="button-publish">
            {isSaving === "publish" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Publish"}
          </Button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 shrink-0 border-r">
          <SectionList
            sections={sections}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            onToggle={handleToggle}
            onAdd={handleAddSection}
            onRemove={handleRemove}
            onMove={handleMove}
            testimonialsEligible={testimonialsEligible}
            bestSellersEligible={bestSellersEligible}
          />
        </div>
        <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/30 p-6">
          <div className="h-full overflow-hidden rounded-lg border bg-background shadow-sm transition-all" style={{ width: DEVICE_WIDTHS[device] }}>
            <iframe
              ref={iframeRef}
              src={`/store/${restaurant.slug}?preview=1`}
              className="h-full w-full border-0"
              title="Store preview"
              onLoad={() => setIframeReady(true)}
              data-testid="iframe-store-preview"
            />
          </div>
        </div>
        <div className="w-80 shrink-0 overflow-y-auto border-l">
          <FieldPanel
            selectedKey={selectedKey}
            section={activeSection}
            socialLinks={socialLinks!}
            onFieldsChange={handleFieldsChange}
            onSocialLinksChange={setSocialLinks}
          />
        </div>
      </div>
    </div>
  );
}
