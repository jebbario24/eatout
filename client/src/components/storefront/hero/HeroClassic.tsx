import { Star, Clock, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Restaurant, CustomerReview } from "@shared/schema";

export interface StorefrontHeroProps {
  restaurant: Restaurant;
  reviews: CustomerReview[];
  todayHoursText: string;
  isOpen: boolean;
  t: (key: string) => string;
}

// Extracted verbatim from the storefront's original fixed hero — the fallback for
// every merchant who hasn't picked one of the 3 full themes. Must stay byte-for-byte
// behavior-identical to what every existing storefront already renders.
export function HeroClassic({ restaurant, reviews, todayHoursText, isOpen, t }: StorefrontHeroProps) {
  return (
    <div className="relative">
      {restaurant.coverImageUrl ? (
        <div
          className="h-48 md:h-64 lg:h-80 bg-cover bg-center"
          style={{ backgroundImage: `url(${restaurant.coverImageUrl})` }}
        />
      ) : (
        <div className="h-48 md:h-64 lg:h-80 bg-gradient-to-br from-primary/20 to-primary/5" />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="-mt-16 md:-mt-20 mb-6">
          <div className="flex items-end gap-4">
            <div className="flex flex-col items-center gap-2">
              {reviews.length > 0 && (
                <div className="flex items-center gap-1 bg-background/95 backdrop-blur px-3 py-1.5 rounded-full shadow-lg" data-testid="rating-above-logo">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="text-sm font-semibold">
                    {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">({reviews.length})</span>
                </div>
              )}

              {restaurant.logoUrl ? (
                <img
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  className="h-24 w-24 md:h-32 md:w-32 rounded-full object-cover bg-background border-4 border-background shadow-xl"
                />
              ) : (
                <div className="h-24 w-24 md:h-32 md:w-32 rounded-full bg-background border-4 border-background shadow-xl flex items-center justify-center">
                  <Store className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground" />
                </div>
              )}

              {reviews.length > 0 && (
                <div className="flex items-center gap-0.5" data-testid="rating-below-logo">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="pb-2 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold">{restaurant.name}</h1>
                <Badge
                  variant={isOpen ? "default" : "secondary"}
                  className={`text-sm px-3 py-1 ${isOpen ? 'bg-green-600 dark:bg-green-600 hover:bg-green-700 dark:hover:bg-green-700' : 'bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-700'} text-white`}
                  data-testid="badge-open-status"
                >
                  {isOpen ? t('storefront.open') : t('storefront.closed')}
                </Badge>
              </div>
              {restaurant.description && (
                <p className="text-muted-foreground mt-1 hidden sm:block">{restaurant.description}</p>
              )}
              {todayHoursText && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Clock className="h-4 w-4" />
                  <span data-testid="text-today-hours">{todayHoursText}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
