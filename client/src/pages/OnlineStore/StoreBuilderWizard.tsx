import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Sparkles, Loader2, ExternalLink, Palette, Wand2, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Restaurant, RestaurantThemeSettings } from "@shared/schema";
import { hasValidThemeSettings } from "@/storefront/lib/themeSettings";

const STYLE_OPTIONS = [
  { value: "Luxury - Minimal - Elegant", label: "Luxury & Elegant" },
  { value: "Bold - Vibrant - Street", label: "Bold & Vibrant" },
  { value: "Natural - Organic - Warm", label: "Natural & Warm" },
  { value: "Fresh - Clean", label: "Fresh & Clean" },
  { value: "Modern", label: "Modern" },
];

const ANALYSIS_STEPS = [
  "Analyzing your catalog...",
  "Reading your customer reviews...",
  "Choosing a color palette...",
  "Drafting your homepage copy...",
];

interface Generation {
  id: string;
  blueprint: { themeSettings: RestaurantThemeSettings; colors: { primaryColor: string; secondaryColor: string; accentColor: string }; facts: any; changes: Array<{ description: string }> };
}

type Step = "loading" | "landing" | "details" | "analyzing" | "preview";

export default function StoreBuilderWizard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [step, setStep] = useState<Step>("loading");
  const [analysisIndex, setAnalysisIndex] = useState(0);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [form, setForm] = useState({ businessName: "", targetAudience: "", targetMarket: "", stylePreference: STYLE_OPTIONS[4].value });

  const { data: restaurant, isLoading } = useQuery<Restaurant | null>({ queryKey: ["/api/restaurants/me"] });

  useEffect(() => {
    if (!restaurant || step !== "loading") return;
    setForm((f) => ({ ...f, businessName: restaurant.name }));
    setStep(hasValidThemeSettings(restaurant.themeSettings) ? "landing" : "details");
  }, [restaurant, step]);

  useEffect(() => {
    if (step !== "analyzing") return;
    const interval = setInterval(() => setAnalysisIndex((i) => Math.min(i + 1, ANALYSIS_STEPS.length - 1)), 700);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (step === "preview" && iframeReady && generation && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "STOREFRONT_DRAFT_UPDATE", themeSettings: generation.blueprint.themeSettings, colors: generation.blueprint.colors },
        window.location.origin
      );
    }
  }, [step, iframeReady, generation]);

  const runGenerate = async () => {
    setAnalysisIndex(0);
    setStep("analyzing");
    const start = Date.now();
    try {
      const res = await apiRequest("/api/store/generate", "POST", form);
      const data: Generation = await res.json();
      const elapsed = Date.now() - start;
      setTimeout(() => {
        setGeneration(data);
        setIframeReady(false);
        setStep("preview");
      }, Math.max(0, 1800 - elapsed));
    } catch {
      toast({ variant: "destructive", title: "Couldn't generate your store", description: "Please try again." });
      setStep("details");
    }
  };

  const applyGeneration = async () => {
    if (!generation) return;
    setIsApplying(true);
    try {
      await apiRequest(`/api/store/generations/${generation.id}/apply`, "POST");
      await queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Your store is ready!" });
      navigate("/online-store/editor");
    } catch {
      toast({ variant: "destructive", title: "Failed to apply", description: "Please try again." });
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading || step === "loading") {
    return <div className="flex h-full min-h-[70vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (step === "landing" && restaurant) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <StoreIcon className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Online Store</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/online-store/editor">
            <Card className="cursor-pointer transition-shadow hover:shadow-md" data-testid="card-open-editor">
              <CardContent className="space-y-2 p-5">
                <Palette className="h-5 w-5 text-primary" />
                <p className="font-medium">Store Editor</p>
                <p className="text-sm text-muted-foreground">Edit sections, content, and colors with a live preview.</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/online-store/optimize">
            <Card className="cursor-pointer transition-shadow hover:shadow-md" data-testid="card-open-optimize">
              <CardContent className="space-y-2 p-5">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="font-medium">AI Optimization</p>
                <p className="text-sm text-muted-foreground">Scan for real improvements and apply them instantly.</p>
              </CardContent>
            </Card>
          </Link>
          <a href={`/store/${restaurant.slug}`} target="_blank" rel="noopener noreferrer">
            <Card className="cursor-pointer transition-shadow hover:shadow-md" data-testid="card-view-live">
              <CardContent className="space-y-2 p-5">
                <ExternalLink className="h-5 w-5 text-primary" />
                <p className="font-medium">View Live Store</p>
                <p className="text-sm text-muted-foreground">Open your storefront at /store/{restaurant.slug}.</p>
              </CardContent>
            </Card>
          </a>
        </div>
        <button className="mt-6 text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => setStep("details")} data-testid="button-rebuild-store">
          Rebuild my store from scratch
        </button>
      </div>
    );
  }

  if (step === "details") {
    return (
      <div className="mx-auto max-w-lg p-6">
        <div className="mb-1 text-sm font-medium text-primary">Step 1 of 4</div>
        <h1 className="mb-1 text-xl font-semibold">Tell us about your business</h1>
        <p className="mb-6 text-sm text-muted-foreground">We'll use this to generate a storefront tailored to you — no design skills needed.</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Business name</Label>
            <Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} data-testid="input-business-name" />
          </div>
          <div className="space-y-1.5">
            <Label>Who's your target audience?</Label>
            <Input
              value={form.targetAudience}
              onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              placeholder="e.g. Young professionals who value quality"
              data-testid="input-target-audience"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Primary market</Label>
            <Input
              value={form.targetMarket}
              onChange={(e) => setForm({ ...form, targetMarket: e.target.value })}
              placeholder="e.g. United States"
              data-testid="input-target-market"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Visual style</Label>
            <Select value={form.stylePreference} onValueChange={(v) => setForm({ ...form, stylePreference: v })}>
              <SelectTrigger data-testid="select-style-preference"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STYLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" size="lg" onClick={runGenerate} disabled={!form.businessName} data-testid="button-analyze">
            <Wand2 className="mr-2 h-4 w-4" />
            Analyze My Business
          </Button>
        </div>
      </div>
    );
  }

  if (step === "analyzing") {
    return (
      <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-4">
        <div className="mb-1 text-sm font-medium text-primary">Step 2 of 4</div>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="font-medium">{ANALYSIS_STEPS[analysisIndex]}</p>
      </div>
    );
  }

  // step === "preview"
  return (
    <div className="flex h-full min-h-[70vh] flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div>
          <div className="text-sm font-medium text-primary">Step 3 of 4</div>
          <p className="font-semibold">Your optimized storefront</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setStep("details")} data-testid="button-regenerate">
            Start over
          </Button>
          <Button size="sm" onClick={applyGeneration} disabled={isApplying} data-testid="button-apply-generation">
            {isApplying ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            Use this store
          </Button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto bg-muted/30 p-6">
          <div className="mx-auto h-full max-w-5xl overflow-hidden rounded-lg border bg-background shadow-sm">
            <iframe
              ref={iframeRef}
              src={restaurant ? `/store/${restaurant.slug}?preview=1` : undefined}
              className="h-full w-full border-0"
              title="Generated store preview"
              onLoad={() => setIframeReady(true)}
              data-testid="iframe-generated-preview"
            />
          </div>
        </div>
        {generation && (
          <div className="w-72 shrink-0 overflow-y-auto border-l p-4">
            <p className="mb-3 font-medium">What we set up</p>
            <ul className="space-y-2">
              {generation.blueprint.changes.map((c, i) => (
                <li key={i} className="text-sm text-muted-foreground">• {c.description}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              You'll get full control to edit every section, image, and color after this.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
