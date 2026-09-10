import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import type { MenuItem } from "@shared/schema";

interface FrequentlyBoughtTogetherProps {
  currentItem: MenuItem;
  relatedItems: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
  message?: string;
}

export function FrequentlyBoughtTogether({ 
  currentItem, 
  relatedItems, 
  onAddToCart,
  message = "Frequently bought together"
}: FrequentlyBoughtTogetherProps) {
  if (!relatedItems || relatedItems.length === 0) {
    return null;
  }

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(price));
  };

  const handleAddBundle = () => {
    relatedItems.slice(0, 3).forEach(item => {
      if (item.isAvailable) {
        onAddToCart(item);
      }
    });
  };

  const totalPrice = relatedItems.slice(0, 3).reduce((sum, item) => 
    sum + parseFloat(item.price), 0
  );

  return (
    <Card className="border-primary/20" data-testid="frequently-bought-together">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          {message}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {relatedItems.slice(0, 3).map((item) => (
            <div 
              key={item.id} 
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover-elevate"
              data-testid={`suggestion-item-${item.id}`}
            >
              {item.imageUrl && (
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  className="h-16 w-16 rounded-md object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{item.name}</h4>
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                )}
                <p className="text-sm font-semibold text-primary mt-1">{formatPrice(item.price)}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddToCart(item)}
                disabled={!item.isAvailable}
                data-testid={`button-add-suggestion-${item.id}`}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          ))}
          
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Bundle Total:</span>
              <span className="text-lg font-bold text-primary">{formatPrice(totalPrice.toString())}</span>
            </div>
            <Button 
              className="w-full"
              onClick={handleAddBundle}
              data-testid="button-add-bundle"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Bundle to Cart
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
