import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Restaurant } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  ExternalLink,
  Image as ImageIcon,
  Laptop,
  Layers,
  LayoutGrid,
  Megaphone,
  Menu as MenuIcon,
  Palette,
  Plus,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Upload,
} from "lucide-react";
import type { UploadResult } from "@uppy/core";
import { getBusinessTypeConfig } from "@/lib/businessType";
import { STOREFRONT_THEMES, type StorefrontThemeId } from "@/lib/storefrontThemes";
import {
  SECTION_LABELS,
  SECTION_TYPES,
  createDefaultBlock,
  createDefaultSection,
  type ThemeSection,
  type ThemeSectionType,
} from "@/lib/themeSections";

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const body = error.message.replace(/^\d+:\s*/, "");
    try {
      const p = JSON.parse(body);
      if (p?.message) return p.message;
    } catch {
      /* not JSON */
    }
  }
  return fallback;
}

interface NavItem {
  id: string;
  label: string;
  type: "home" | "blog" | "page" | "collection" | "shop" | "url";
  value?: string;
  external?: boolean;
}

interface Announcement {
  enabled: boolean;
  text: string;
  linkLabel: string;
  linkUrl: string;
}

interface CustomizerDraft {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  announcement: Announcement;
  storefrontNav: { items: NavItem[] };
  seoTitle: string;
  seoDescription: string;
  seoImageUrl: string;
  sections: ThemeSection[];
  cardStyle: "standard" | "bordered";
  homepageLayout: "full" | "curated";
  themeId?: StorefrontThemeId;
}

const defaultDraft: CustomizerDraft = {
  primaryColor: "#f97316",
  secondaryColor: "#fb923c",
  accentColor: "#fdba74",
  announcement: { enabled: false, text: "", linkLabel: "", linkUrl: "" },
  storefrontNav: { items: [] },
  seoTitle: "",
  seoDescription: "",
  seoImageUrl: "",
  sections: [],
  // Existing merchants who never touched this setting keep today's boxed-card look —
  // "standard" only ever appears via an explicit preset pick or toggle here.
  cardStyle: "bordered",
  // Existing merchants who never touch this keep today's full grid on the homepage —
  // "curated" only ever appears via an explicit toggle here.
  homepageLayout: "full",
};

function draftFromRestaurant(restaurant: any): CustomizerDraft {
  return {
    primaryColor: restaurant.primaryColor || defaultDraft.primaryColor,
    secondaryColor: restaurant.secondaryColor || defaultDraft.secondaryColor,
    accentColor: restaurant.accentColor || defaultDraft.accentColor,
    announcement: { ...defaultDraft.announcement, ...(restaurant.announcement || {}) },
    storefrontNav: { items: restaurant.storefrontNav?.items || [] },
    seoTitle: restaurant.seoTitle || "",
    seoDescription: restaurant.seoDescription || "",
    seoImageUrl: restaurant.seoImageUrl || "",
    sections: restaurant.themeSettings?.sections || [],
    cardStyle: restaurant.themeSettings?.cardStyle === "standard" ? "standard" : "bordered",
    homepageLayout: restaurant.themeSettings?.homepageLayout === "curated" ? "curated" : "full",
    themeId: restaurant.themeSettings?.themeId || undefined,
  };
}

// Reshapes the editor's flat draft into the actual restaurant field shape
// (Storefront.tsx reads restaurant.themeSettings.sections, not a top-level `sections`).
function draftToRestaurantPatch(draft: CustomizerDraft) {
  return {
    primaryColor: draft.primaryColor,
    secondaryColor: draft.secondaryColor,
    accentColor: draft.accentColor,
    announcement: draft.announcement,
    storefrontNav: { items: draft.storefrontNav.items },
    seoTitle: draft.seoTitle,
    seoDescription: draft.seoDescription,
    seoImageUrl: draft.seoImageUrl,
    themeSettings: { sections: draft.sections, cardStyle: draft.cardStyle, homepageLayout: draft.homepageLayout, themeId: draft.themeId },
  };
}

export default function OnlineStoreCustomize() {
  const { toast } = useToast();
  const { data: restaurant, isLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants/me"],
  });
  const { data: pages = [] } = useQuery<any[]>({ queryKey: ["/api/pages"] });
  const { data: collections = [] } = useQuery<any[]>({ queryKey: ["/api/collections"] });
  const businessConfig = getBusinessTypeConfig(restaurant?.businessType);

  const [draft, setDraft] = useState<CustomizerDraft>(defaultDraft);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const initialized = useRef(false);
  useEffect(() => {
    if (restaurant && !initialized.current) {
      setDraft(draftFromRestaurant(restaurant));
      initialized.current = true;
    }
  }, [restaurant]);

  const updateDraft = (patch: Partial<CustomizerDraft>) => setDraft((prev) => ({ ...prev, ...patch }));

  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Always holds the latest draft so the mount-once "ready" listener below never
  // posts a stale closure back to the iframe after restaurant data finishes loading.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "eatout:preview-update", payload: draftToRestaurantPatch(draft) },
      window.location.origin
    );
  }, [draft]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "eatout:preview-ready") {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "eatout:preview-update", payload: draftToRestaurantPatch(draftRef.current) },
          window.location.origin
        );
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const logoMutation = useMutation({
    mutationFn: async (logoUrl: string) => apiRequest("/api/restaurant/logo", "PUT", { logoUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Logo uploaded successfully!" });
    },
    onError: () => toast({ title: "Failed to upload logo", variant: "destructive" }),
  });

  const coverImageMutation = useMutation({
    mutationFn: async (coverImageUrl: string) => apiRequest("/api/restaurant/cover-image", "PUT", { coverImageUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Cover photo uploaded successfully!" });
    },
    onError: () => toast({ title: "Failed to upload cover photo", variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!restaurant?.id) throw new Error("No restaurant");
      return apiRequest(`/api/restaurants/${restaurant.id}`, "PUT", draftToRestaurantPatch(draft));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Theme saved" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to save") }),
  });

  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", { method: "POST", credentials: "include" });
    const data = await response.json();
    return { method: "PUT" as const, url: data.uploadURL, objectPath: data.objectPath };
  };

  const handleLogoComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    const file = result.successful?.[0];
    const objectPath = file?.meta?.objectPath as string | undefined;
    if (objectPath) logoMutation.mutate(objectPath);
  };

  const handleCoverComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    const file = result.successful?.[0];
    const objectPath = file?.meta?.objectPath as string | undefined;
    if (objectPath) coverImageMutation.mutate(objectPath);
  };

  const handleSectionImageComplete = (sectionIdx: number) => (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    const file = result.successful?.[0];
    const objectPath = file?.meta?.objectPath as string | undefined;
    if (objectPath) updateSectionSettings(sectionIdx, { imageUrl: objectPath });
  };

  const handleBlockImageComplete = (sectionIdx: number, blockIdx: number) => (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    const file = result.successful?.[0];
    const objectPath = file?.meta?.objectPath as string | undefined;
    if (objectPath) updateBlock(sectionIdx, blockIdx, { imageUrl: objectPath });
  };

  const addNavItem = () =>
    updateDraft({
      storefrontNav: {
        items: [
          ...draft.storefrontNav.items,
          { id: crypto.randomUUID?.() || String(Date.now()), label: "New link", type: "home", value: "" },
        ],
      },
    });
  const updateNavItem = (i: number, patch: Partial<NavItem>) =>
    updateDraft({
      storefrontNav: { items: draft.storefrontNav.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) },
    });
  const moveNavItem = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    const items = draft.storefrontNav.items;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    updateDraft({ storefrontNav: { items: copy } });
  };
  const removeNavItem = (i: number) =>
    updateDraft({ storefrontNav: { items: draft.storefrontNav.items.filter((_, idx) => idx !== i) } });

  const addSection = (type: ThemeSectionType) => updateDraft({ sections: [...draft.sections, createDefaultSection(type)] });
  const updateSection = (i: number, patch: Partial<ThemeSection>) =>
    updateDraft({ sections: draft.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  const updateSectionSettings = (i: number, patch: Record<string, any>) =>
    updateSection(i, { settings: { ...draft.sections[i].settings, ...patch } });
  const moveSection = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.sections.length) return;
    const copy = [...draft.sections];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    updateDraft({ sections: copy });
  };
  const removeSection = (i: number) => updateDraft({ sections: draft.sections.filter((_, idx) => idx !== i) });
  const toggleSectionEnabled = (i: number) => updateSection(i, { enabled: draft.sections[i].enabled === false });

  const addBlock = (sectionIdx: number) => {
    const section = draft.sections[sectionIdx];
    updateSection(sectionIdx, { blocks: [...section.blocks, createDefaultBlock(section.type)] });
  };
  const updateBlock = (sectionIdx: number, blockIdx: number, patch: Record<string, any>) => {
    const section = draft.sections[sectionIdx];
    updateSection(sectionIdx, {
      blocks: section.blocks.map((b, idx) => (idx === blockIdx ? { ...b, settings: { ...b.settings, ...patch } } : b)),
    });
  };
  const moveBlock = (sectionIdx: number, blockIdx: number, dir: -1 | 1) => {
    const section = draft.sections[sectionIdx];
    const j = blockIdx + dir;
    if (j < 0 || j >= section.blocks.length) return;
    const copy = [...section.blocks];
    [copy[blockIdx], copy[j]] = [copy[j], copy[blockIdx]];
    updateSection(sectionIdx, { blocks: copy });
  };
  const removeBlock = (sectionIdx: number, blockIdx: number) => {
    const section = draft.sections[sectionIdx];
    updateSection(sectionIdx, { blocks: section.blocks.filter((_, idx) => idx !== blockIdx) });
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">No business found. Please set up your business first.</p>
      </div>
    );
  }

  const storefrontUrl = restaurant.slug ? `/store/${restaurant.slug}` : "#";
  const previewUrl = restaurant.slug ? `/store/${restaurant.slug}?preview=1` : "about:blank";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b bg-background px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/online-store">
            <Button variant="ghost" size="icon" data-testid="button-back-to-themes">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-display font-semibold" data-testid="text-page-title">Customize</h1>
            <p className="text-xs text-muted-foreground">Default Theme</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border p-0.5 mr-2">
            <Button
              size="icon"
              variant={previewDevice === "desktop" ? "secondary" : "ghost"}
              className="h-7 w-7"
              onClick={() => setPreviewDevice("desktop")}
              data-testid="button-preview-desktop"
              title="Desktop preview"
            >
              <Laptop className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant={previewDevice === "tablet" ? "secondary" : "ghost"}
              className="h-7 w-7"
              onClick={() => setPreviewDevice("tablet")}
              data-testid="button-preview-tablet"
              title="Tablet preview"
            >
              <Tablet className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant={previewDevice === "mobile" ? "secondary" : "ghost"}
              className="h-7 w-7"
              onClick={() => setPreviewDevice("mobile")}
              data-testid="button-preview-mobile"
              title="Mobile preview"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button variant="outline" onClick={() => window.open(storefrontUrl, "_blank")} data-testid="button-preview-storefront">
            <ExternalLink className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-theme">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        <ResizablePanel defaultSize={34} minSize={26} maxSize={48}>
          <div className="h-full overflow-y-auto p-4 space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-2">Theme Settings</h3>
              <Accordion type="multiple" className="w-full">
              <AccordionItem value="fullTheme">
                <AccordionTrigger data-testid="accordion-full-theme">
                  <span className="flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> Full Theme</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="themeId">Storefront theme</Label>
                    <Select
                      value={draft.themeId || "__classic__"}
                      onValueChange={(v) => updateDraft({ themeId: v === "__classic__" ? undefined : (v as StorefrontThemeId) })}
                    >
                      <SelectTrigger id="themeId" data-testid="select-full-theme">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__classic__">Classic (default)</SelectItem>
                        {STOREFRONT_THEMES.map((theme) => (
                          <SelectItem key={theme.id} value={theme.id}>{theme.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Changes the hero layout and adds a signature section (marquee, category grid, or best-sellers tabs). Your colors and manually-added sections below are unaffected.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="colors">
                <AccordionTrigger data-testid="accordion-colors">
                  <span className="flex items-center gap-2"><Palette className="h-4 w-4" /> Brand Colors</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={draft.primaryColor}
                        onChange={(e) => updateDraft({ primaryColor: e.target.value })}
                        className="h-10 w-16 cursor-pointer"
                        data-testid="input-primary-color"
                      />
                      <Input
                        type="text"
                        value={draft.primaryColor}
                        onChange={(e) => updateDraft({ primaryColor: e.target.value })}
                        className="flex-1"
                        data-testid="input-primary-color-text"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Used for buttons and links</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={draft.secondaryColor}
                        onChange={(e) => updateDraft({ secondaryColor: e.target.value })}
                        className="h-10 w-16 cursor-pointer"
                        data-testid="input-secondary-color"
                      />
                      <Input
                        type="text"
                        value={draft.secondaryColor}
                        onChange={(e) => updateDraft({ secondaryColor: e.target.value })}
                        className="flex-1"
                        data-testid="input-secondary-color-text"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Used for backgrounds</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accentColor"
                        type="color"
                        value={draft.accentColor}
                        onChange={(e) => updateDraft({ accentColor: e.target.value })}
                        className="h-10 w-16 cursor-pointer"
                        data-testid="input-accent-color"
                      />
                      <Input
                        type="text"
                        value={draft.accentColor}
                        onChange={(e) => updateDraft({ accentColor: e.target.value })}
                        className="flex-1"
                        data-testid="input-accent-color-text"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Used for highlights</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cardStyle">
                <AccordionTrigger data-testid="accordion-card-style">
                  <span className="flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> Product Cards</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardStyle">Card style</Label>
                    <Select value={draft.cardStyle} onValueChange={(v) => updateDraft({ cardStyle: v as "standard" | "bordered" })}>
                      <SelectTrigger id="cardStyle" data-testid="select-card-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (borderless, image-first)</SelectItem>
                        <SelectItem value="bordered">Bordered (boxed cards)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Standard is a cleaner, more editorial look with no card borders or shadows. Bordered is the classic boxed-card style.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="homepageLayout">Homepage layout</Label>
                    <Select value={draft.homepageLayout} onValueChange={(v) => updateDraft({ homepageLayout: v as "full" | "curated" })}>
                      <SelectTrigger id="homepageLayout" data-testid="select-homepage-layout">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full catalog (today's default)</SelectItem>
                        <SelectItem value="curated">Curated (bestsellers + "Shop all")</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Full catalog shows every product on the homepage. Curated shows a bestsellers strip (tag items "Bestseller" or "Popular" to feature them) with a link to the full shop page instead.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="seo">
                <AccordionTrigger data-testid="accordion-seo">
                  <span className="flex items-center gap-2">Search Engine Listing</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="seo-title">Page title</Label>
                    <Input
                      id="seo-title"
                      value={draft.seoTitle}
                      onChange={(e) => updateDraft({ seoTitle: e.target.value })}
                      placeholder={restaurant.name || "Your store name"}
                      maxLength={70}
                      data-testid="input-seo-title"
                    />
                    <p className="text-xs text-muted-foreground">{draft.seoTitle.length}/70</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="seo-description">Meta description</Label>
                    <Textarea
                      id="seo-description"
                      rows={3}
                      value={draft.seoDescription}
                      onChange={(e) => updateDraft({ seoDescription: e.target.value })}
                      placeholder={restaurant.description || "A short summary customers see in search results"}
                      maxLength={320}
                      data-testid="input-seo-description"
                    />
                    <p className="text-xs text-muted-foreground">{draft.seoDescription.length}/320</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="seo-image">Social preview image URL</Label>
                    <Input
                      id="seo-image"
                      value={draft.seoImageUrl}
                      onChange={(e) => updateDraft({ seoImageUrl: e.target.value })}
                      placeholder="Falls back to your cover photo"
                      data-testid="input-seo-image"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
              </Accordion>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-2">Header</h3>
              <Accordion type="multiple" defaultValue={["branding"]} className="w-full">
              <AccordionItem value="branding">
                <AccordionTrigger data-testid="accordion-logo-header">
                  <span className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Logo</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <Label>{businessConfig.business} Logo</Label>
                  {restaurant.logoUrl ? (
                    <div className="border rounded-lg p-3 space-y-3">
                      <img
                        src={restaurant.logoUrl}
                        alt={`${businessConfig.business} logo`}
                        className="h-20 w-20 object-cover rounded-lg mx-auto"
                        data-testid="img-restaurant-logo"
                      />
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={5242880}
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleLogoComplete}
                        buttonClassName="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Change Logo
                      </ObjectUploader>
                    </div>
                  ) : (
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5242880}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleLogoComplete}
                      buttonClassName="w-full"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Upload Logo
                    </ObjectUploader>
                  )}
                  <p className="text-xs text-muted-foreground">Recommended: Square image, max 5MB</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="hero">
                <AccordionTrigger data-testid="accordion-hero">
                  <span className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Cover Banner</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <Label>Cover Photo</Label>
                  {restaurant.coverImageUrl ? (
                    <div className="border rounded-lg p-3 space-y-3">
                      <img
                        src={restaurant.coverImageUrl}
                        alt="Cover photo"
                        className="h-20 w-full object-cover rounded-lg"
                        data-testid="img-cover-photo"
                      />
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={5242880}
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleCoverComplete}
                        buttonClassName="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Change Cover Photo
                      </ObjectUploader>
                    </div>
                  ) : (
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5242880}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleCoverComplete}
                      buttonClassName="w-full"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Upload Cover Photo
                    </ObjectUploader>
                  )}
                  <p className="text-xs text-muted-foreground">Recommended: 1200x400px, max 5MB</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="announcement">
                <AccordionTrigger data-testid="accordion-announcement">
                  <span className="flex items-center gap-2"><Megaphone className="h-4 w-4" /> Announcement Bar</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={draft.announcement.enabled}
                      onCheckedChange={(v) => updateDraft({ announcement: { ...draft.announcement, enabled: v } })}
                      data-testid="switch-announcement"
                    />
                    Show the announcement bar
                  </label>
                  <div className="space-y-1.5">
                    <Label>Message</Label>
                    <Input
                      value={draft.announcement.text}
                      onChange={(e) => updateDraft({ announcement: { ...draft.announcement, text: e.target.value } })}
                      placeholder="Free shipping on orders over $30"
                      data-testid="input-announcement-text"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Link label (optional)</Label>
                      <Input
                        value={draft.announcement.linkLabel}
                        onChange={(e) => updateDraft({ announcement: { ...draft.announcement, linkLabel: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Link URL (optional)</Label>
                      <Input
                        value={draft.announcement.linkUrl}
                        onChange={(e) => updateDraft({ announcement: { ...draft.announcement, linkUrl: e.target.value } })}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="navigation">
                <AccordionTrigger data-testid="accordion-navigation">
                  <span className="flex items-center gap-2"><MenuIcon className="h-4 w-4" /> Storefront Navigation</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {draft.storefrontNav.items.map((it, i) => (
                    <div key={it.id || i} className="flex flex-wrap items-end gap-2 rounded-md border p-3" data-testid={`nav-item-${i}`}>
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input className="w-32" value={it.label} onChange={(e) => updateNavItem(i, { label: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Links to</Label>
                        <Select value={it.type} onValueChange={(v) => updateNavItem(i, { type: v as NavItem["type"], value: "" })}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="home">Store home</SelectItem>
                            <SelectItem value="blog">Blog</SelectItem>
                            <SelectItem value="page">A page</SelectItem>
                            <SelectItem value="collection">A collection</SelectItem>
                            <SelectItem value="shop">Shop page</SelectItem>
                            <SelectItem value="url">External URL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {it.type === "page" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Page</Label>
                          <Select value={it.value} onValueChange={(v) => updateNavItem(i, { value: v })}>
                            <SelectTrigger className="w-36"><SelectValue placeholder="Choose" /></SelectTrigger>
                            <SelectContent>{pages.map((p) => <SelectItem key={p.id} value={p.handle}>{p.title}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      )}
                      {it.type === "collection" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Collection</Label>
                          <Select value={it.value} onValueChange={(v) => updateNavItem(i, { value: v })}>
                            <SelectTrigger className="w-36"><SelectValue placeholder="Choose" /></SelectTrigger>
                            <SelectContent>{collections.map((c) => <SelectItem key={c.id} value={c.handle}>{c.title}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      )}
                      {it.type === "url" && (
                        <div className="space-y-1">
                          <Label className="text-xs">URL</Label>
                          <Input className="w-40" value={it.value} onChange={(e) => updateNavItem(i, { value: e.target.value })} placeholder="https://" />
                        </div>
                      )}
                      <div className="ml-auto flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => moveNavItem(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => moveNavItem(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => removeNavItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addNavItem} data-testid="button-add-nav-item">
                    <Plus className="mr-2 h-4 w-4" />
                    Add link
                  </Button>
                </AccordionContent>
              </AccordionItem>
              </Accordion>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-2">Template</h3>
              <Accordion type="multiple" className="w-full">
              {draft.sections.map((section, i) => {
                    const s = section.settings;
                    const hasHeadingText = section.type !== "multicolumn" && section.type !== "testimonials";
                    const hasButton = section.type === "image-banner" || section.type === "image-with-text" || section.type === "rich-text";
                    const hasImage = section.type === "image-banner" || section.type === "image-with-text";
                    const hasBlocks = section.type === "multicolumn" || section.type === "testimonials" || section.type === "image-banner";
                    return (
                      <AccordionItem key={section.id} value={section.id} className={section.enabled === false ? "opacity-50" : undefined}>
                        <div className="flex items-center">
                          <AccordionTrigger className="flex-1" data-testid={`accordion-section-${i}`}>
                            <span className="flex items-center gap-2"><Layers className="h-4 w-4" /> {SECTION_LABELS[section.type]}</span>
                          </AccordionTrigger>
                          <div className="flex gap-0.5 shrink-0 pr-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => toggleSectionEnabled(i)}
                              data-testid={`button-toggle-section-${i}`}
                              title={section.enabled === false ? "Show section" : "Hide section"}
                            >
                              {section.enabled === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveSection(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveSection(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeSection(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </div>
                      <AccordionContent className="space-y-3">
                        {hasImage && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Image</Label>
                            {s.imageUrl ? (
                              <div className="space-y-2">
                                <img src={s.imageUrl} alt="" className="h-20 w-full object-cover rounded-md" />
                                <ObjectUploader
                                  maxNumberOfFiles={1}
                                  maxFileSize={5242880}
                                  onGetUploadParameters={handleGetUploadParameters}
                                  onComplete={handleSectionImageComplete(i)}
                                  buttonClassName="w-full"
                                >
                                  Change image
                                </ObjectUploader>
                              </div>
                            ) : (
                              <ObjectUploader
                                maxNumberOfFiles={1}
                                maxFileSize={5242880}
                                onGetUploadParameters={handleGetUploadParameters}
                                onComplete={handleSectionImageComplete(i)}
                                buttonClassName="w-full"
                              >
                                Upload image
                              </ObjectUploader>
                            )}
                          </div>
                        )}

                        {hasHeadingText && (
                          <>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Heading</Label>
                              <Input value={s.heading || ""} onChange={(e) => updateSectionSettings(i, { heading: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Text</Label>
                              <Textarea rows={2} value={s.text || ""} onChange={(e) => updateSectionSettings(i, { text: e.target.value })} />
                            </div>
                          </>
                        )}

                        {section.type === "multicolumn" && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Heading</Label>
                            <Input value={s.heading || ""} onChange={(e) => updateSectionSettings(i, { heading: e.target.value })} />
                          </div>
                        )}

                        {section.type === "testimonials" && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Heading</Label>
                            <Input value={s.heading || ""} onChange={(e) => updateSectionSettings(i, { heading: e.target.value })} />
                          </div>
                        )}

                        {hasButton && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Button label</Label>
                              <Input value={s.buttonLabel || ""} onChange={(e) => updateSectionSettings(i, { buttonLabel: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Button URL</Label>
                              <Input value={s.buttonUrl || ""} onChange={(e) => updateSectionSettings(i, { buttonUrl: e.target.value })} placeholder="https://" />
                            </div>
                          </div>
                        )}

                        {section.type === "image-with-text" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Layout</Label>
                              <Select value={s.layout} onValueChange={(v) => updateSectionSettings(i, { layout: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="image-left">Image left</SelectItem>
                                  <SelectItem value="image-right">Image right</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Content position</Label>
                              <Select value={s.contentPosition} onValueChange={(v) => updateSectionSettings(i, { contentPosition: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="top">Top</SelectItem>
                                  <SelectItem value="middle">Middle</SelectItem>
                                  <SelectItem value="bottom">Bottom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {section.type === "image-banner" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Height</Label>
                              <Select value={s.height} onValueChange={(v) => updateSectionSettings(i, { height: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="small">Small</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="large">Large</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Content position</Label>
                              <Select value={s.contentPosition} onValueChange={(v) => updateSectionSettings(i, { contentPosition: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="top-left">Top left</SelectItem>
                                  <SelectItem value="top-center">Top center</SelectItem>
                                  <SelectItem value="top-right">Top right</SelectItem>
                                  <SelectItem value="middle-left">Middle left</SelectItem>
                                  <SelectItem value="middle-center">Middle center</SelectItem>
                                  <SelectItem value="middle-right">Middle right</SelectItem>
                                  <SelectItem value="bottom-left">Bottom left</SelectItem>
                                  <SelectItem value="bottom-center">Bottom center</SelectItem>
                                  <SelectItem value="bottom-right">Bottom right</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {section.type === "multicolumn" && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Columns</Label>
                            <Select value={String(s.columns)} onValueChange={(v) => updateSectionSettings(i, { columns: Number(v) })}>
                              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="4">4</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label className="text-xs">Color scheme</Label>
                          <Select value={s.colorScheme} onValueChange={(v) => updateSectionSettings(i, { colorScheme: v })}>
                            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Default</SelectItem>
                              <SelectItem value="primary">Primary</SelectItem>
                              <SelectItem value="secondary">Secondary</SelectItem>
                              <SelectItem value="accent">Accent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {section.type === "image-banner" && (
                          <p className="text-xs text-muted-foreground">
                            The image above is always shown first — add more slides below to auto-rotate.
                          </p>
                        )}

                        {hasBlocks && (
                          <div className="space-y-2 pt-2 border-t">
                            <Label className="text-xs">
                              {section.type === "multicolumn" ? "Columns" : section.type === "testimonials" ? "Testimonials" : "Slides"}
                            </Label>
                            {section.blocks.map((block, bi) => (
                              <div key={block.id} className="rounded-md border p-2 space-y-2" data-testid={`block-${i}-${bi}`}>
                                {section.type === "image-banner" ? (
                                  <>
                                    {block.settings.imageUrl ? (
                                      <div className="space-y-2">
                                        <img src={block.settings.imageUrl} alt="" className="h-20 w-full object-cover rounded-md" />
                                        <ObjectUploader
                                          maxNumberOfFiles={1}
                                          maxFileSize={5242880}
                                          onGetUploadParameters={handleGetUploadParameters}
                                          onComplete={handleBlockImageComplete(i, bi)}
                                          buttonClassName="w-full"
                                        >
                                          Change image
                                        </ObjectUploader>
                                      </div>
                                    ) : (
                                      <ObjectUploader
                                        maxNumberOfFiles={1}
                                        maxFileSize={5242880}
                                        onGetUploadParameters={handleGetUploadParameters}
                                        onComplete={handleBlockImageComplete(i, bi)}
                                        buttonClassName="w-full"
                                      >
                                        Upload image
                                      </ObjectUploader>
                                    )}
                                    <Input
                                      value={block.settings.heading || ""}
                                      onChange={(e) => updateBlock(i, bi, { heading: e.target.value })}
                                      placeholder="Heading"
                                    />
                                    <Textarea
                                      rows={2}
                                      value={block.settings.text || ""}
                                      onChange={(e) => updateBlock(i, bi, { text: e.target.value })}
                                      placeholder="Text"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input
                                        value={block.settings.buttonLabel || ""}
                                        onChange={(e) => updateBlock(i, bi, { buttonLabel: e.target.value })}
                                        placeholder="Button label"
                                      />
                                      <Input
                                        value={block.settings.buttonUrl || ""}
                                        onChange={(e) => updateBlock(i, bi, { buttonUrl: e.target.value })}
                                        placeholder="Button URL"
                                      />
                                    </div>
                                  </>
                                ) : section.type === "multicolumn" ? (
                                  <>
                                    <div className="flex gap-2">
                                      <Input
                                        className="w-16"
                                        value={block.settings.icon || ""}
                                        onChange={(e) => updateBlock(i, bi, { icon: e.target.value })}
                                        placeholder="✨"
                                      />
                                      <Input
                                        className="flex-1"
                                        value={block.settings.title || ""}
                                        onChange={(e) => updateBlock(i, bi, { title: e.target.value })}
                                        placeholder="Title"
                                      />
                                    </div>
                                    <Textarea
                                      rows={2}
                                      value={block.settings.text || ""}
                                      onChange={(e) => updateBlock(i, bi, { text: e.target.value })}
                                      placeholder="Text"
                                    />
                                    <ObjectUploader
                                      maxNumberOfFiles={1}
                                      maxFileSize={5242880}
                                      onGetUploadParameters={handleGetUploadParameters}
                                      onComplete={handleBlockImageComplete(i, bi)}
                                      buttonClassName="w-full"
                                    >
                                      {block.settings.imageUrl ? "Change image" : "Upload image (optional)"}
                                    </ObjectUploader>
                                  </>
                                ) : (
                                  <>
                                    <Input
                                      value={block.settings.customerName || ""}
                                      onChange={(e) => updateBlock(i, bi, { customerName: e.target.value })}
                                      placeholder="Customer name"
                                    />
                                    <Textarea
                                      rows={2}
                                      value={block.settings.quote || ""}
                                      onChange={(e) => updateBlock(i, bi, { quote: e.target.value })}
                                      placeholder="Quote"
                                    />
                                    <Select value={String(block.settings.rating || 5)} onValueChange={(v) => updateBlock(i, bi, { rating: Number(v) })}>
                                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {[1, 2, 3, 4, 5].map((n) => (
                                          <SelectItem key={n} value={String(n)}>{n} star{n > 1 ? "s" : ""}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </>
                                )}
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => moveBlock(i, bi, -1)}><ArrowUp className="h-4 w-4" /></Button>
                                  <Button size="icon" variant="ghost" onClick={() => moveBlock(i, bi, 1)}><ArrowDown className="h-4 w-4" /></Button>
                                  <Button size="icon" variant="ghost" onClick={() => removeBlock(i, bi)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                              </div>
                            ))}
                            <Button size="sm" variant="outline" onClick={() => addBlock(i)}>
                              <Plus className="mr-2 h-4 w-4" />
                              {section.type === "multicolumn" ? "Add column" : section.type === "testimonials" ? "Add testimonial" : "Add slide"}
                            </Button>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                    );
                  })}
              </Accordion>

              <div className="flex flex-wrap gap-2 pt-3 px-1">
                {SECTION_TYPES.map((type) => (
                  <Button key={type} size="sm" variant="outline" onClick={() => addSection(type)} data-testid={`button-add-section-${type}`}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {SECTION_LABELS[type]}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={66}>
          <div className="h-full bg-muted/30 p-4">
            <div
              className={`mx-auto h-full overflow-hidden rounded-lg border bg-background shadow-sm transition-all ${
                previewDevice === "mobile" ? "w-[390px]" : previewDevice === "tablet" ? "w-[768px]" : "w-full max-w-5xl"
              }`}
            >
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="h-full w-full border-0"
                title="Storefront preview"
                data-testid="iframe-storefront-preview"
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
