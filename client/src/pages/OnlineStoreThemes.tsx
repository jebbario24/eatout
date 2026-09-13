import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Restaurant } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Check, ExternalLink, Palette } from "lucide-react";
import { THEME_PRESETS, matchPreset, type ThemePreset } from "@/lib/themePresets";
import { STOREFRONT_THEMES, type StorefrontThemeDef } from "@/lib/storefrontThemes";
import { getReadyTemplateSections } from "@/lib/readyTemplateSections";

export default function OnlineStoreThemes() {
  const { toast } = useToast();
  const { data: restaurant, isLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants/me"],
  });

  const applyPresetMutation = useMutation({
    mutationFn: async (preset: ThemePreset) => {
      if (!restaurant?.id) throw new Error("No restaurant");
      const currentThemeSettings = (restaurant.themeSettings as any) || {};
      return apiRequest(`/api/restaurants/${restaurant.id}`, "PUT", {
        primaryColor: preset.primaryColor,
        secondaryColor: preset.secondaryColor,
        accentColor: preset.accentColor,
        themeSettings: { ...currentThemeSettings, cardStyle: preset.cardStyle },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Theme applied" });
    },
    onError: () => toast({ title: "Failed to apply theme", variant: "destructive" }),
  });

  const applyStorefrontThemeMutation = useMutation({
    mutationFn: async (theme: StorefrontThemeDef) => {
      if (!restaurant?.id) throw new Error("No restaurant");
      const currentThemeSettings = (restaurant.themeSettings as any) || {};
      const currentSections = Array.isArray(currentThemeSettings.sections) ? currentThemeSettings.sections : [];
      if (currentSections.length > 0) {
        const proceed = window.confirm(
          "This ready-made template comes with its own set of sections (brand story, FAQ, etc.) and will replace the sections you currently have. Continue?"
        );
        if (!proceed) throw new Error("__cancelled__");
      }
      return apiRequest(`/api/restaurants/${restaurant.id}`, "PUT", {
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        accentColor: theme.accentColor,
        themeSettings: {
          ...currentThemeSettings,
          cardStyle: theme.cardStyle,
          themeId: theme.id,
          sections: getReadyTemplateSections(theme.id, restaurant.name),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Template applied", description: "Your storefront now has a brand story, FAQ, and more — fine-tune it in Customize." });
    },
    onError: (e: Error) => {
      if (e.message === "__cancelled__") return;
      toast({ title: "Failed to apply template", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 max-w-5xl mx-auto w-full">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-80 w-full" />
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
  const activePreset = matchPreset(restaurant);

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-page-title">Online Store</h1>
          <p className="text-muted-foreground">Manage the look and feel of your storefront</p>
        </div>
        <Button variant="outline" onClick={() => window.open(storefrontUrl, "_blank")} data-testid="button-preview-storefront">
          <ExternalLink className="h-4 w-4 mr-2" />
          Preview Storefront
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Current Theme</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative bg-muted/30" data-testid="theme-preview">
            {restaurant.slug ? (
              <iframe
                src={storefrontUrl}
                className="w-full h-64 border-0 pointer-events-none"
                title="Storefront preview"
                data-testid="iframe-theme-preview"
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                Set up your store's URL slug in Settings to preview your theme
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t bg-background/95 backdrop-blur px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {restaurant.slug ? `/store/${restaurant.slug}` : restaurant.name}
                </p>
                <p className="text-xs text-muted-foreground">{activePreset ? activePreset.name : "Custom"} theme</p>
              </div>
              <a href="/online-store/customize" target="_blank" rel="noopener noreferrer">
                <Button size="sm" data-testid="button-customize-theme">
                  <Palette className="h-4 w-4 mr-2" />
                  Edit theme
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-display font-semibold mb-1">Ready Templates</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Complete, ready-to-launch storefronts — hero, product cards, brand story, FAQ, and newsletter sign-up already filled in. Pick one, then fine-tune it in Customize.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STOREFRONT_THEMES.map((theme) => {
            const isActive = (restaurant.themeSettings as any)?.themeId === theme.id;
            return (
              <Card key={theme.id} className={isActive ? "overflow-hidden ring-2 ring-primary" : "overflow-hidden"}>
                <CardContent className="p-0">
                  <div className="rounded-t-lg overflow-hidden border-b bg-background h-28" data-testid={`preview-theme-${theme.id}`}>
                    {theme.id === "editorial" && (
                      <div className="h-full w-full flex flex-col justify-center items-center gap-1.5" style={{ backgroundColor: theme.primaryColor }}>
                        <div className="h-1.5 w-16 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                        <div className="h-2.5 w-24 rounded-sm bg-white/90" />
                        <div className="h-1 w-full mt-2" style={{ backgroundColor: theme.secondaryColor }} />
                      </div>
                    )}
                    {theme.id === "fresh" && (
                      <div className="h-full w-full p-3 flex flex-col gap-2" style={{ backgroundColor: `${theme.primaryColor}1a` }}>
                        <div className="h-8 w-full rounded-xl" style={{ backgroundColor: theme.secondaryColor }} />
                        <div className="flex gap-1.5 justify-center">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-6 w-6 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                          ))}
                        </div>
                      </div>
                    )}
                    {theme.id === "wellness" && (
                      <div className="h-full w-full grid grid-cols-2">
                        <div className="h-full" style={{ backgroundColor: theme.primaryColor }} />
                        <div className="h-full flex flex-col justify-center gap-1.5 p-3" style={{ backgroundColor: `${theme.accentColor}55` }}>
                          <div className="h-2 w-3/4 rounded-sm bg-foreground/70" />
                          <div className="flex gap-1">
                            <div className="h-3 w-10 rounded-full" style={{ backgroundColor: theme.secondaryColor }} />
                          </div>
                        </div>
                      </div>
                    )}
                    {theme.id === "nova" && (
                      <div
                        className="relative h-full w-full flex flex-col justify-center items-center gap-2 overflow-hidden"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        <div
                          className="absolute inset-0 opacity-10"
                          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "10px 10px" }}
                        />
                        <div className="relative h-2 w-20 bg-white/90" />
                        <div className="relative h-1.5 w-10" style={{ backgroundColor: theme.accentColor }} />
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex-col items-start gap-3 pt-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{theme.name}</p>
                    {isActive && (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{theme.description}</p>
                  <Button
                    size="sm"
                    variant={isActive ? "outline" : "default"}
                    disabled={isActive || applyStorefrontThemeMutation.isPending}
                    onClick={() => applyStorefrontThemeMutation.mutate(theme)}
                    className="w-full"
                    data-testid={`button-apply-theme-${theme.id}`}
                  >
                    {isActive ? "Currently applied" : "Apply template"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-display font-semibold mb-1">Theme Gallery</h2>
        <p className="text-sm text-muted-foreground mb-4">Pick a starting point, then fine-tune it with Customize.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {THEME_PRESETS.map((preset) => {
            const isActive = activePreset?.id === preset.id;
            return (
              <Card key={preset.id} className={isActive ? "overflow-hidden ring-2 ring-primary" : "overflow-hidden"}>
                <CardContent className="p-0">
                  <div className="rounded-t-lg overflow-hidden border-b bg-background">
                    <div
                      className="h-16 w-full"
                      style={{ background: `linear-gradient(135deg, ${preset.primaryColor}, ${preset.secondaryColor})` }}
                    />
                    <div className="grid grid-cols-3 gap-2 p-3">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="space-y-1">
                          <div className="h-10 rounded-md" style={{ backgroundColor: preset.accentColor }} />
                          <div className="h-1.5 w-3/4 rounded-full bg-muted" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex-col items-start gap-3 pt-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{preset.name}</p>
                    {isActive && (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                  <Button
                    size="sm"
                    variant={isActive ? "outline" : "default"}
                    disabled={isActive || applyPresetMutation.isPending}
                    onClick={() => applyPresetMutation.mutate(preset)}
                    className="w-full"
                    data-testid={`button-apply-preset-${preset.id}`}
                  >
                    {isActive ? "Currently applied" : "Apply theme"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
