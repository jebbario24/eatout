import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Restaurant, RestaurantThemeSettings, ThemeSectionType, CustomerReview, MenuItem, StorefrontThemeId } from "@shared/schema";
import { SectionList } from "./components/SectionList";
import { FieldPanel } from "./components/FieldPanel";
import { DeviceSwitcher, DEVICE_WIDTHS, type DeviceMode } from "./components/DeviceSwitcher";
import { hasValidThemeSettings } from "@/storefront/lib/themeSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Colors = { primaryColor: string; secondaryColor: string; accentColor: string };

export default function StoreEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedKey, setSelectedKey] = useState<string>("hero");
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [themeSettings, setThemeSettings] = useState<RestaurantThemeSettings | null>(null);
  const [colors, setColors] = useState<Colors | null>(null);
  const [isSaving, setIsSaving] = useState<"save" | "publish" | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  const { data: restaurant, isLoading } = useQuery<Restaurant | null>({ queryKey: ["/api/restaurants/me"] });
  const { data: reviews = [] } = useQuery<CustomerReview[]>({ queryKey: ["/api/reviews"] });
  const { data: items = [] } = useQuery<MenuItem[]>({ queryKey: ["/api/menu/items"] });

  useEffect(() => {
    if (restaurant && !themeSettings) {
      setThemeSettings(hasValidThemeSettings(restaurant.themeSettings) ? restaurant.themeSettings : null);
      setColors({
        primaryColor: restaurant.primaryColor || "#111111",
        secondaryColor: restaurant.secondaryColor || "#ffffff",
        accentColor: restaurant.accentColor || "#2563eb",
      });
    }
  }, [restaurant, themeSettings]);

  const postDraft = () => {
    if (!iframeRef.current?.contentWindow || !themeSettings || !colors) return;
    iframeRef.current.contentWindow.postMessage({ type: "STOREFRONT_DRAFT_UPDATE", themeSettings, colors }, window.location.origin);
  };

  useEffect(() => {
    if (iframeReady) postDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeSettings, colors, iframeReady]);

  if (isLoading || !restaurant) {
    return <div className="flex h-full min-h-[70vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!themeSettings) {
    return (
      <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold">Your online store hasn't been generated yet.</p>
        <Link href="/online-store"><Button>Set up your store</Button></Link>
      </div>
    );
  }

  const sections = themeSettings.layout.sections;
  const activeSection = sections.find((s) => s.type === selectedKey);
  const testimonialsEligible = reviews.filter((r) => r.isPublished && r.rating >= 4).length >= 3;
  const bestSellersEligible = items.some((i: any) => i.isAvailable && i.visibleOnline && (i.tags || []).some((t: string) => /bestseller/i.test(t)));

  const updateSections = (next: typeof sections) => {
    setThemeSettings((prev) => (prev ? { ...prev, layout: { ...prev.layout, sections: next } } : prev));
  };

  const handleToggle = (type: ThemeSectionType, enabled: boolean) => {
    updateSections(sections.map((s) => (s.type === type ? { ...s, enabled } : s)));
  };

  const handleFieldsChange = (type: ThemeSectionType, fields: Record<string, any>) => {
    updateSections(sections.map((s) => (s.type === type ? { ...s, fields } : s)));
  };

  const handleThemeChange = (theme: StorefrontThemeId) => {
    setThemeSettings((prev) => (prev ? { ...prev, theme } : prev));
  };

  const save = async (publish: boolean) => {
    if (!themeSettings || !colors) return;
    setIsSaving(publish ? "publish" : "save");
    try {
      await apiRequest("/api/store/theme", "PATCH", { themeSettings, ...colors, publish });
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
          <Link href="/online-store"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
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
            colors={colors!}
            onFieldsChange={handleFieldsChange}
            onColorsChange={setColors}
          />
        </div>
      </div>
    </div>
  );
}
