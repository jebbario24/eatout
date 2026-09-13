import { motion } from "framer-motion";
import { Link } from "wouter";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StorefrontHeroProps } from "./HeroClassic";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

// Full-bleed photography, serif display headline, pill-shaped status badge —
// an editorial/fashion-forward hero. Layout only; colors come from the merchant's
// theme-seeded primary/secondary/accent CSS vars, same as every other theme.
export function HeroEditorial({ restaurant, reviews, todayHoursText, isOpen, t, shopHref }: StorefrontHeroProps) {
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <div className="relative h-[70vh] min-h-[420px] max-h-[720px] overflow-hidden bg-foreground">
      {restaurant.coverImageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${restaurant.coverImageUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-background" />
      )}
      <div className="absolute inset-0 bg-black/45" />

      <motion.div
        className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6"
        initial="hidden"
        animate="show"
        variants={staggerContainer}
      >
        {reviews.length > 0 && (
          <motion.div variants={fadeUp} className="mb-4">
            <span className="rounded-full px-4 py-1.5 text-xs font-semibold text-white bg-white/15 backdrop-blur flex items-center gap-1 w-fit">
              <Star className="h-3.5 w-3.5 fill-white" />
              {avgRating.toFixed(1)} ({reviews.length})
            </span>
          </motion.div>
        )}

        <motion.h1
          variants={fadeUp}
          className="font-serif text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-white max-w-3xl"
        >
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
              <Button
                size="lg"
                className="rounded-full bg-background text-foreground hover:bg-background/90 px-8"
                data-testid="button-hero-shop-now"
              >
                Shop now
              </Button>
            </Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
