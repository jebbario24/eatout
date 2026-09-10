import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowUp, Sparkles, Lightbulb } from "lucide-react";
import type { MenuItem } from "@shared/schema";

interface MarketingTriggersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalItem: MenuItem | null;
  suggestedItems: MenuItem[];
  triggerType: 'upsell' | 'crossSell' | 'downsell';
  onAddSuggestedItem: (item: MenuItem) => void;
  onContinue: () => void;
  formatPrice: (price: number | string) => string;
  selectedLanguage?: string;
}

const getTriggerConfig = (type: 'upsell' | 'crossSell' | 'downsell') => {
  switch (type) {
    case 'upsell':
      return {
        title: 'Upgrade Your Order',
        subtitle: 'Consider these premium options',
        Icon: ArrowUp,
        badgeVariant: 'default' as const,
      };
    case 'crossSell':
      return {
        title: 'Perfect Pairings',
        subtitle: 'Customers also loved these items',
        Icon: Sparkles,
        badgeVariant: 'secondary' as const,
      };
    case 'downsell':
      return {
        title: 'Similar Items',
        subtitle: 'Check out these alternatives',
        Icon: Lightbulb,
        badgeVariant: 'outline' as const,
      };
  }
};

export function MarketingTriggersModal({
  open,
  onOpenChange,
  originalItem,
  suggestedItems,
  triggerType,
  onAddSuggestedItem,
  onContinue,
  formatPrice,
  selectedLanguage,
}: MarketingTriggersModalProps) {
  const config = getTriggerConfig(triggerType);
  const Icon = config.Icon;

  if (!originalItem || suggestedItems.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-marketing-triggers">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {config.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm font-medium">
              You're ordering: <span className="text-primary">{originalItem.name}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestedItems.map((item) => (
              <Card 
                key={item.id} 
                className="overflow-hidden hover-elevate"
                data-testid={`card-suggested-item-${item.id}`}
              >
                <CardContent className="p-0">
                  {item.imageUrl && (
                    <div className="relative h-32 bg-muted">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      {triggerType === 'upsell' && (
                        <Badge 
                          className="absolute top-2 right-2"
                          variant={config.badgeVariant}
                        >
                          Premium
                        </Badge>
                      )}
                      {triggerType === 'crossSell' && (
                        <Badge 
                          className="absolute top-2 right-2"
                          variant={config.badgeVariant}
                        >
                          Popular Pairing
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className="font-semibold mb-1">{item.name}</h4>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-primary">
                        {formatPrice(item.price)}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onAddSuggestedItem(item)}
                        disabled={!item.isAvailable}
                        data-testid={`button-add-suggested-${item.id}`}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>

                    {!item.isAvailable && (
                      <Badge variant="destructive" className="w-full justify-center">
                        Out of Stock
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onContinue}
            data-testid="button-continue-without-suggestions"
          >
            No Thanks
          </Button>
          <Button
            onClick={onContinue}
            data-testid="button-continue-to-cart"
          >
            Continue to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
