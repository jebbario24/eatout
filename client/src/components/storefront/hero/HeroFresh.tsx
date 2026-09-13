import { motion } from "framer-motion";
import { Star, Store } from "lucide-react";
import type { StorefrontHeroProps } from "./HeroClassic";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

// Warm, rounded, friendly hero — a soft image banner with an overlapping rounded
// info card, suited to grocery/fresh-goods storefronts.
export function HeroFresh({ restaurant, reviews, todayHoursText, isOpen, t }: StorefrontHeroProps) {
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <div className="relative rounded-3xl overflow-hidden h-56 md:h-72">
        {restaurant.coverImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${restaurant.coverImageUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20" />
        )}
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="relative z-10 -mt-12 mx-4 md:mx-8 rounded-2xl bg-card border shadow-lg p-5 md:p-6 flex items-center gap-4"
      >
        {restaurant.logoUrl ? (
          <img
            src={restaurant.logoUrl}
            alt={restaurant.name}
            className="h-16 w-16 md:h-20 md:w-20 rounded-2xl object-cover shrink-0"
          />
        ) : (
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-muted flex items-center justify-center shrink-0">
            <Store className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-display font-bold truncate">{restaurant.name}</h1>
          </div>
          {reviews.length > 0 && (
            <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                {avgRating.toFixed(1)} ({reviews.length})
              </span>
            </div>
          )}
          {restaurant.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1 hidden sm:block">{restaurant.description}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
