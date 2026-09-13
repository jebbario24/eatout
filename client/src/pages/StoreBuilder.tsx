import { useMemo, useRef, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, ArrowRight, Palette, Layers, ShoppingBag, Menu as MenuIcon, Share2, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Restaurant } from "@shared/schema";

interface StoreBrief {
  description?: string;
  targetAudience?: string;
  targetMarket?: string;
}

// One generation engine, two entry points: right after signup (kind "initial",
// blank-slate store) and the "Optimize My Store" button inside the theme editor
// (kind "optimize", diffed against whatever the merchant already has). Either
// way nothing touches the live storefront until the merchant reviews the
// reasoned proposal below and clicks Apply.
// Navigation here always uses a hard `window.location.href` reload rather than
// wouter's setLocation: this page (like the theme editor) bypasses the normal
// dashboard shell via a plain `window.location.pathname` check in App(), which
// only re-evaluates on a full navigation, not a client-side route change.
export default function StoreBuilder() {
  const mode: "initial" | "optimize" = new URLSearchParams(window.location.search).get("mode") === "optimize" ? "optimize" : "initial";

  const { data: restaurant } = useQuery<Restaurant>({ queryKey: ["/api/restaurants/me"] });

  const [brief, setBrief] = useState<StoreBrief>({ description: "", targetAudience: "", targetMarket: "" });
  useEffect(() => {
    if (restaurant && !brief.targetMarket) {
      setBrief((b) => ({
        ...b,
        targetMarket: b.targetMarket || restaurant.country || "",
        ...(restaurant.brandProfile ? (restaurant.brandProfile as StoreBrief) : {}),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant]);

  const [generation, setGeneration] = useState<any | null>(null);
  const [approved, setApproved] = useState<Record<string, any>>({});

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/store-builder/generate", "POST", { kind: mode, brief });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneration(data);
      const bp = data.blueprint;
      setApproved({
        palette: mode === "initial" && !!bp.palette,
        theme: true,
        cardStyle: true,
        homepageLayout: true,
        nav: !!bp.navPlan,
        sectionTypes: bp.newSections.map((s: any) => s.type),
        collectionTitles: bp.collectionsToCreate.map((c: any) => c.title),
      });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => apiRequest(`/api/store-builder/proposals/${generation.id}/apply`, "POST", { approved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      window.location.href = "/online-store/customize";
    },
  });

  const discardMutation = useMutation({
    mutationFn: async () => apiRequest(`/api/store-builder/proposals/${generation.id}/discard`, "POST", {}),
    onSuccess: () => { window.location.href = mode === "optimize" ? "/online-store/customize" : "/dashboard"; },
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewUrl = restaurant?.slug ? `/store/${restaurant.slug}?preview=1` : "about:blank";

  const previewPatch = useMemo(() => {
    if (!generation || !restaurant) return null;
    const bp = generation.blueprint;
    const currentThemeSettings = (restaurant.themeSettings as any) || {};
    const currentSections: any[] = Array.isArray(currentThemeSettings.sections) ? currentThemeSettings.sections : [];
    const sectionsToAppend = bp.newSections
      .filter((s: any) => (approved.sectionTypes || []).includes(s.type))
      .map((s: any) => ({ id: `preview-${s.type}`, type: s.type, settings: s.settings, blocks: s.blocks.map((b: any, i: number) => ({ id: `preview-${s.type}-${i}`, type: b.type, settings: b.settings })), enabled: true }));
    const patch: any = {
      themeSettings: {
        ...currentThemeSettings,
        themeId: approved.theme ? bp.themeId.value : currentThemeSettings.themeId,
        cardStyle: approved.cardStyle ? bp.cardStyle.value : currentThemeSettings.cardStyle,
        homepageLayout: approved.homepageLayout ? bp.homepageLayout.value : currentThemeSettings.homepageLayout,
        sections: [...currentSections, ...sectionsToAppend],
      },
    };
    if (approved.palette && bp.palette) {
      patch.primaryColor = bp.palette.value.primaryColor;
      patch.secondaryColor = bp.palette.value.secondaryColor;
      patch.accentColor = bp.palette.value.accentColor;
    }
    if (approved.nav && bp.navPlan) {
      patch.storefrontNav = { items: bp.navPlan.value };
    }
    return patch;
  }, [generation, restaurant, approved]);

  useEffect(() => {
    if (!previewPatch) return;
    iframeRef.current?.contentWindow?.postMessage({ type: "eatout:preview-update", payload: previewPatch }, window.location.origin);
  }, [previewPatch]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "eatout:preview-ready" && previewPatch) {
        iframeRef.current?.contentWindow?.postMessage({ type: "eatout:preview-update", payload: previewPatch }, window.location.origin);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [previewPatch]);

  const toggleSectionType = (type: string) => {
    setApproved((a) => {
      const current: string[] = a.sectionTypes || [];
      return { ...a, sectionTypes: current.includes(type) ? current.filter((t) => t !== type) : [...current, type] };
    });
  };
  const toggleCollection = (title: string) => {
    setApproved((a) => {
      const current: string[] = a.collectionTitles || [];
      return { ...a, collectionTitles: current.includes(title) ? current.filter((t) => t !== title) : [...current, title] };
    });
  };

  if (!generation) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">AI Store Builder</span>
          </div>
          <h1 className="text-3xl font-display font-bold">
            {mode === "optimize" ? "Optimize your store" : "Let's build your store"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "optimize"
              ? "We'll look at your current storefront, catalog, and reviews, and suggest specific improvements — nothing changes until you approve it."
              : "Tell us a bit about your brand and we'll analyze your business info and products to put together a first draft of your storefront — you'll review and can adjust everything before it goes live."}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="brief-description">Describe your brand (optional, but helps a lot)</Label>
              <Textarea
                id="brief-description"
                rows={3}
                placeholder={`e.g. "Luxury women's fashion brand targeting women aged 20-35 in Europe."`}
                value={brief.description}
                onChange={(e) => setBrief({ ...brief, description: e.target.value })}
                data-testid="input-brief-description"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="brief-audience">Target audience</Label>
                <Input
                  id="brief-audience"
                  placeholder="e.g. Women 20-35"
                  value={brief.targetAudience}
                  onChange={(e) => setBrief({ ...brief, targetAudience: e.target.value })}
                  data-testid="input-brief-audience"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brief-market">Target market</Label>
                <Input
                  id="brief-market"
                  placeholder="e.g. Europe"
                  value={brief.targetMarket}
                  onChange={(e) => setBrief({ ...brief, targetMarket: e.target.value })}
                  data-testid="input-brief-market"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          {mode === "initial" ? (
            <Button variant="ghost" onClick={() => { window.location.href = "/dashboard"; }} data-testid="button-skip-builder">
              <SkipForward className="h-4 w-4 mr-2" />
              Skip for now
            </Button>
          ) : <div />}
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} data-testid="button-generate-store">
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {generateMutation.isPending ? "Analyzing your store…" : "Generate my store"}
            {!generateMutation.isPending && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </div>
    );
  }

  const bp = generation.blueprint;
  const usedLLM = !!generation.copy?.usedLLM;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b bg-background px-6 py-3 shrink-0">
        <div>
          <h1 className="text-lg font-display font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Review your proposal
          </h1>
          <p className="text-xs text-muted-foreground">
            Detected: {bp.vertical.replace("-", " ")} · {bp.tier} tier {usedLLM ? "· copy drafted by AI" : "· copy from templates (add ANTHROPIC_API_KEY for AI-drafted copy)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => discardMutation.mutate()} disabled={discardMutation.isPending} data-testid="button-discard-proposal">
            Discard
          </Button>
          <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending} data-testid="button-apply-proposal">
            {applyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Apply & continue editing
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-full max-w-md shrink-0 overflow-y-auto border-r p-5 space-y-5">
          {bp.palette && (
            <ProposalCard icon={Palette} title="Brand palette" reason={bp.palette.reason}>
              <label className="flex items-center gap-3">
                <Checkbox checked={!!approved.palette} onCheckedChange={(v) => setApproved({ ...approved, palette: !!v })} data-testid="checkbox-palette" />
                <div className="flex gap-1.5">
                  {[bp.palette.value.primaryColor, bp.palette.value.secondaryColor, bp.palette.value.accentColor].map((c: string) => (
                    <div key={c} className="h-6 w-6 rounded-full border" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </label>
            </ProposalCard>
          )}

          <ProposalCard icon={Layers} title="Theme & layout" reason={bp.themeId.reason}>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!approved.theme} onCheckedChange={(v) => setApproved({ ...approved, theme: !!v })} data-testid="checkbox-theme" />
              Theme: <Badge variant="secondary">{bp.themeId.value || "Classic"}</Badge>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!approved.cardStyle} onCheckedChange={(v) => setApproved({ ...approved, cardStyle: !!v })} data-testid="checkbox-cardstyle" />
              Card style: <Badge variant="secondary">{bp.cardStyle.value}</Badge>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!approved.homepageLayout} onCheckedChange={(v) => setApproved({ ...approved, homepageLayout: !!v })} data-testid="checkbox-homepagelayout" />
              Homepage: <Badge variant="secondary">{bp.homepageLayout.value}</Badge>
            </label>
            <p className="text-xs text-muted-foreground">{bp.cardStyle.reason} {bp.homepageLayout.reason}</p>
          </ProposalCard>

          {bp.newSections.length > 0 && (
            <ProposalCard icon={Layers} title="New sections">
              {bp.newSections.map((s: any) => (
                <label key={s.type} className="flex items-start gap-2 text-sm py-1">
                  <Checkbox
                    checked={(approved.sectionTypes || []).includes(s.type)}
                    onCheckedChange={() => toggleSectionType(s.type)}
                    data-testid={`checkbox-section-${s.type}`}
                  />
                  <span>
                    <span className="font-medium capitalize">{s.type.replace("-", " ")}</span>
                    <span className="block text-xs text-muted-foreground">{s.reason}</span>
                  </span>
                </label>
              ))}
            </ProposalCard>
          )}

          {bp.collectionsToCreate.length > 0 && (
            <ProposalCard icon={ShoppingBag} title="Collections to create">
              {bp.collectionsToCreate.map((c: any) => (
                <label key={c.title} className="flex items-start gap-2 text-sm py-1">
                  <Checkbox
                    checked={(approved.collectionTitles || []).includes(c.title)}
                    onCheckedChange={() => toggleCollection(c.title)}
                    data-testid={`checkbox-collection-${c.title}`}
                  />
                  <span>
                    <span className="font-medium">{c.title}</span>
                    <span className="block text-xs text-muted-foreground">{c.reason}</span>
                  </span>
                </label>
              ))}
            </ProposalCard>
          )}

          {bp.navPlan && (
            <ProposalCard icon={MenuIcon} title="Header menu" reason={bp.navPlan.reason}>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!approved.nav} onCheckedChange={(v) => setApproved({ ...approved, nav: !!v })} data-testid="checkbox-nav" />
                {bp.navPlan.value.map((n: any) => n.label).join(" · ")}
              </label>
            </ProposalCard>
          )}

          {!bp.socialFooterGroup.value && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Share2 className="h-3.5 w-3.5" />
              {bp.socialFooterGroup.reason}
            </div>
          )}
        </div>

        <div className="flex-1 bg-muted/30 p-4">
          <div className="mx-auto h-full w-full max-w-5xl overflow-hidden rounded-lg border bg-background shadow-sm">
            <iframe ref={iframeRef} src={previewUrl} className="h-full w-full border-0" title="Store preview" data-testid="iframe-builder-preview" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProposalCard({ icon: Icon, title, reason, children }: { icon: any; title: string; reason?: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle>
          {reason && <CardDescription className="text-xs">{reason}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-1.5 pb-4">{children}</CardContent>
      </Card>
    </motion.div>
  );
}
