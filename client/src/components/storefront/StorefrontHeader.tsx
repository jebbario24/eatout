import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, PackageSearch, UserRound } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import type { Restaurant } from "@shared/schema";
import type { DisplayMarket } from "@/lib/currency";

export interface StorefrontHeaderProps {
  restaurant: Restaurant;
  markets: DisplayMarket[];
  selectedMarketName: string | null;
  onSelectMarket: (name: string) => void;
  sfCustomer: { name?: string | null } | null | undefined;
  accountHref: string;
  trackHref: string;
  cartItemCount: number;
  onOpenAuth: () => void;
  onOpenCart: () => void;
}

// Extracted verbatim (behavior-identical) from Storefront.tsx's sticky header so the
// product and shop pages can share it. Deliberately does NOT own the cart Sheet
// itself — each consumer wires `onOpenCart` to its own cart surface (the main
// storefront's full checkout Sheet, or the lightweight StorefrontCartSheet on the
// new pages).
export function StorefrontHeader({
  restaurant,
  markets,
  selectedMarketName,
  onSelectMarket,
  sfCustomer,
  accountHref,
  trackHref,
  cartItemCount,
  onOpenAuth,
  onOpenCart,
}: StorefrontHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 shrink">
          {restaurant.logoUrl && (
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="h-10 w-10 rounded-full object-cover shrink-0"
            />
          )}
          <span className="font-display font-bold text-lg truncate" title={restaurant.name}>{restaurant.name}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {markets.length > 0 && (
            <Select value={selectedMarketName ?? "__default__"} onValueChange={onSelectMarket}>
              <SelectTrigger className="w-auto h-9 gap-1.5" data-testid="select-market">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">{restaurant.currency || 'USD'}</SelectItem>
                {markets.map((m: any) => (
                  <SelectItem key={m.name} value={m.name}>{m.name} ({m.currency})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <LanguageSelector
            enabledLanguages={restaurant?.enabledLanguages || ['en']}
            restaurantId={restaurant?.id}
          />

          <Link href={trackHref}>
            <Button variant="ghost" size="icon" title="Track an order" data-testid="button-track-order">
              <PackageSearch className="h-5 w-5" />
            </Button>
          </Link>

          {sfCustomer ? (
            <Link href={accountHref}>
              <Button variant="ghost" size="sm" data-testid="button-account">
                <UserRound className="h-4 w-4 mr-1.5" />
                {sfCustomer.name ? sfCustomer.name.split(" ")[0] : "Account"}
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" size="sm" onClick={onOpenAuth} data-testid="button-signin">
              <UserRound className="h-4 w-4 mr-1.5" />
              Sign in
            </Button>
          )}

          <Button variant="default" className="relative" onClick={onOpenCart} data-testid="button-cart">
            <ShoppingCart className="h-5 w-5 mr-2" />
            {t('storefront.cart')}
            {cartItemCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 rounded-full" data-testid="cart-count">
                {cartItemCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
