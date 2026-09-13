import { Link } from "wouter";
import { motion } from "framer-motion";
import { Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Restaurant, CustomerReview } from "@shared/schema";

export interface StorefrontHeroProps {
  restaurant: Restaurant;
  reviews: CustomerReview[];
  todayHoursText: string;
  isOpen: boolean;
  t: (key: string) => string;
  // Link to the full catalog/shop page — every hero variant's primary CTA.
  shopHref?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

// The default storefront hero — every merchant who hasn't picked one of the full
// themes gets this. Deliberately a product-catalog banner (full-bleed image,
// headline, "Shop now" CTA) rather than a local-business-listing profile header
// (avatar, star rating, hours as the lead element) — this storefront sells
// products, across every business vertical, not just restaurants.
export function HeroClassic({ restaurant, reviews, todayHoursText, isOpen, t, shopHref }: StorefrontHeroProps) {
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <div className="relative h-[56vh] min-h-[380px] max-h-[620px] overflow-hidden bg-foreground">
      {restaurant.coverImageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${restaurant.coverImageUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-background" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />

      <motion.div
        className="relative z-10 h-full flex flex-col items-start justify-end px-6 sm:px-10 lg:px-16 pb-12 max-w-3xl"
        initial="hidden"
        animate="show"
        variants={staggerContainer}
      >
        <motion.div variants={fadeUp} className="flex items-center gap-3 mb-3 text-xs font-medium text-white/80">
          <span
            className={`inline-flex items-center gap-1.5 ${isOpen ? "text-emerald-300" : "text-red-300"}`}
            data-testid="badge-open-status"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-emerald-300" : "bg-red-300"}`} />
            {isOpen ? t("storefront.open") : t("storefront.closed")}
          </span>
          {todayHoursText && (
            <span className="flex items-center gap-1" data-testid="text-today-hours">
              <Clock className="h-3 w-3" />
              {todayHoursText}
            </span>
          )}
          {reviews.length > 0 && (
            <span className="flex items-center gap-1" data-testid="rating-below-logo">
              <Star className="h-3 w-3 fill-white text-white" />
              {avgRating.toFixed(1)} ({reviews.length})
            </span>
          )}
        </motion.div>

        <motion.h1 variants={fadeUp} className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05]">
          {restaurant.name}
        </motion.h1>

        {restaurant.description && (
          <motion.p variants={fadeUp} className="mt-4 max-w-xl text-white/80 text-base md:text-lg">
            {restaurant.description}
          </motion.p>
        )}

        {shopHref && (
          <motion.div variants={fadeUp} className="mt-7">
            <Link href={shopHref}>
              <Button size="lg" className="px-8" data-testid="button-hero-shop-now">
                Shop now
              </Button>
            </Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
