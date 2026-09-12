import { Link } from "wouter";
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
              <Link href="/online-store/customize">
                <Button size="sm" data-testid="button-customize-theme">
                  <Palette className="h-4 w-4 mr-2" />
                  Edit theme
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

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
