import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart } from "lucide-react";

interface Bundle {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  items: string[];
  regularPrice: number;
  bundlePrice: number;
  sales: number;
  isActive: boolean;
}

interface BundlesSectionProps {
  bundles: Bundle[];
  onAddToCart?: (bundle: Bundle) => void;
  formatPrice?: (price: number | string) => string;
}

export function BundlesSection({ bundles, onAddToCart, formatPrice }: BundlesSectionProps) {
  const activeBundles = bundles.filter(b => b.isActive);

  if (activeBundles.length === 0) {
    return null;
  }

  return (
    <div className="mb-12" data-testid="bundles-section">
      <div className="flex items-center gap-3 mb-6">
        <Package className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Special Bundles & Combos</h2>
        <Badge className="bg-primary">Save More!</Badge>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {activeBundles.map((bundle) => {
          const savings = Number(bundle.regularPrice) - Number(bundle.bundlePrice);
          const savingsPercent = Math.round((savings / Number(bundle.regularPrice)) * 100);

          return (
            <Card key={bundle.id} className="overflow-hidden hover-elevate" data-testid={`bundle-${bundle.id}`}>
              {/* Bundle Image or Placeholder */}
              {bundle.imageUrl ? (
                <div className="relative h-48 overflow-hidden bg-muted">
                  <img 
                    src={bundle.imageUrl} 
                    alt={bundle.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <Badge className="absolute top-3 right-3 bg-green-600 text-white shadow-lg">
                    Save {savingsPercent}%
                  </Badge>
                </div>
              ) : (
                <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <Package className="h-20 w-20 text-primary/20" />
                  <Badge className="absolute top-3 right-3 bg-green-600 text-white shadow-lg">
                    Save {savingsPercent}%
                  </Badge>
                </div>
              )}

              {/* Bundle Details */}
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold line-clamp-2 mb-3">{bundle.name}</h3>
                
                <div className="space-y-1 mb-4">
                  {bundle.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span className="line-clamp-1">{item}</span>
                    </div>
                  ))}
                  {bundle.items.length > 3 && (
                    <div className="text-xs text-muted-foreground pl-3.5">
                      +{bundle.items.length - 3} more items
                    </div>
                  )}
                </div>

                <div className="flex items-baseline gap-3">
                  <div className="text-2xl font-bold">
                    {formatPrice ? formatPrice(bundle.bundlePrice) : `$${Number(bundle.bundlePrice).toFixed(2)}`}
                  </div>
                  <div className="text-sm text-muted-foreground line-through">
                    {formatPrice ? formatPrice(bundle.regularPrice) : `$${Number(bundle.regularPrice).toFixed(2)}`}
                  </div>
                </div>
              </div>

              <CardContent className="p-4">
                <Button 
                  className="w-full gap-2"
                  onClick={() => onAddToCart?.(bundle)}
                  data-testid={`button-add-bundle-${bundle.id}`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add Bundle to Cart
                </Button>
                {bundle.sales > 0 && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    {bundle.sales} customers bought this
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
