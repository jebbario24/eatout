import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Restaurant } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Palette, Store } from "lucide-react";

export default function OnlineStoreThemes() {
  const { data: restaurant, isLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants/me"],
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
  const primaryColor = restaurant.primaryColor || "#f97316";

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
        <CardContent>
          <div
            className="rounded-lg border overflow-hidden bg-background"
            data-testid="theme-thumbnail"
          >
            {/* Header bar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: primaryColor + "33" }}>
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {restaurant.logoUrl ? (
                  <img src={restaurant.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-3.5 w-3.5 text-white" />
                )}
              </div>
              <div className="h-2 w-24 rounded-full bg-muted" />
              <div className="ml-auto flex gap-2">
                <div className="h-2 w-8 rounded-full bg-muted" />
                <div className="h-2 w-8 rounded-full bg-muted" />
              </div>
            </div>
            {/* Hero */}
            <div
              className="h-28 w-full bg-cover bg-center flex items-end p-4"
              style={
                restaurant.coverImageUrl
                  ? { backgroundImage: `url(${restaurant.coverImageUrl})` }
                  : { background: `linear-gradient(135deg, ${primaryColor}33, ${primaryColor}0d)` }
              }
            >
              <div className="h-3 w-32 rounded bg-background/80" />
            </div>
            {/* Product grid mock */}
            <div className="grid grid-cols-4 gap-3 p-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-14 rounded-md bg-muted" />
                  <div className="h-2 w-3/4 rounded-full bg-muted" />
                  <div className="h-2 w-1/2 rounded-full" style={{ backgroundColor: primaryColor + "55" }} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <div>
            <p className="text-sm font-medium">Default Theme</p>
            <p className="text-xs text-muted-foreground">Your storefront's active look</p>
          </div>
          <Link href="/online-store/customize">
            <Button data-testid="button-customize-theme">
              <Palette className="h-4 w-4 mr-2" />
              Customize
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
