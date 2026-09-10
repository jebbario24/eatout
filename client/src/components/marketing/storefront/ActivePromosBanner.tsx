import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Percent, Copy, Check } from "lucide-react";
import { useState } from "react";

interface Promo {
  id: string;
  code: string;
  type: string;
  value: number;
  isActive: boolean;
  buyItemId?: string;
  getItemId?: string;
  buyQuantity?: number;
  getQuantity?: number;
}

interface ActivePromosBannerProps {
  promos: Promo[];
}

export function ActivePromosBanner({ promos }: ActivePromosBannerProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const activePromos = promos.filter(p => p.isActive);

  if (activePromos.length === 0) {
    return null;
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="mb-8" data-testid="active-promos-banner">
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Percent className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Active Promotions</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activePromos.map((promo) => (
              <div 
                key={promo.id} 
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background border"
                data-testid={`promo-${promo.code}`}
              >
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="font-mono text-sm mb-1">
                    {promo.code}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {promo.type === 'percentage' 
                      ? `${promo.value}% off`
                      : promo.type === 'fixed' || promo.type === 'fixed_amount'
                        ? `$${promo.value.toFixed(2)} off`
                        : promo.type === 'free_delivery'
                          ? 'Free Delivery'
                          : promo.type === 'buy_x_get_y'
                            ? `Buy ${promo.buyQuantity} get ${promo.getQuantity} free`
                            : 'Special Offer'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopyCode(promo.code)}
                  className="shrink-0"
                  data-testid={`button-copy-${promo.code}`}
                >
                  {copiedCode === promo.code ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
