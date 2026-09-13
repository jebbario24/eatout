import { motion } from "framer-motion";
import { Star, Store } from "lucide-react";
import type { StorefrontHeroProps } from "./HeroClassic";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

// Genuine 50/50 split hero: photo half + a solid/textured color panel holding the
// store identity — a calm, wellness/beauty-brand layout.
export function HeroWellness({ restaurant, reviews, todayHoursText, isOpen, t }: StorefrontHeroProps) {
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <div className="grid md:grid-cols-2 min-h-[380px] md:h-[64vh] md:max-h-[600px]">
      <div className="relative h-56 md:h-auto order-1">
        {restaurant.coverImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${restaurant.coverImageUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
            {!restaurant.coverImageUrl && (
              <Store className="h-16 w-16 text-primary/40" />
            )}
          </div>
        )}
      </div>

      <div className="order-2 bg-accent/20 flex items-center px-8 md:px-12 py-10">
        <motion.div initial="hidden" animate="show" variants={fadeUp} className="max-w-md">
          {restaurant.logoUrl && (
            <img src={restaurant.logoUrl} alt={restaurant.name} className="h-14 w-14 rounded-full object-cover mb-5" />
          )}
          <h1 className="text-3xl md:text-4xl font-display font-semibold">{restaurant.name}</h1>
          {restaurant.description && (
            <p className="text-muted-foreground mt-3 text-base">{restaurant.description}</p>
          )}
          {reviews.length > 0 && (
            <div className="flex items-center gap-3 mt-5 flex-wrap">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-primary text-primary" />
                {avgRating.toFixed(1)} ({reviews.length})
              </span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
