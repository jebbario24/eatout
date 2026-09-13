import { Badge } from "@/components/ui/badge";

export interface VariantPickerProps {
  variants: any[];
  selectedVariantId: string | null;
  onSelect: (id: string) => void;
  formatPrice: (price: number) => string;
}

// Extracted (behavior-identical) from Storefront.tsx's Variant Picker dialog body so
// the product detail page can render the same option list inline, without a Dialog.
export function VariantPicker({ variants, selectedVariantId, onSelect, formatPrice }: VariantPickerProps) {
  return (
    <div className="space-y-2">
      {variants
        .filter((v: any) => v.isActive)
        .map((v: any) => {
          const outOfStock = v.stockCount != null && v.stockCount <= 0;
          return (
            <button
              key={v.id}
              type="button"
              disabled={outOfStock}
              onClick={() => onSelect(v.id)}
              className={`flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                selectedVariantId === v.id ? "border-primary bg-primary/5" : "hover:bg-accent"
              }`}
              data-testid={`variant-option-${v.id}`}
            >
              <span className="font-medium">{v.name}</span>
              <span className="flex items-center gap-2 text-sm">
                {outOfStock ? (
                  <Badge variant="destructive">Out of stock</Badge>
                ) : v.stockCount != null && v.stockCount <= 5 ? (
                  <Badge variant="outline" className="text-amber-600">Only {v.stockCount} left</Badge>
                ) : null}
                <span className="text-muted-foreground">{formatPrice(v.priceCents / 100)}</span>
              </span>
            </button>
          );
        })}
    </div>
  );
}
