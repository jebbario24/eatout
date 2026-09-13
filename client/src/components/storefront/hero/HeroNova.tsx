import { motion } from "framer-motion";
import { Link } from "wouter";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StorefrontHeroProps } from "./HeroClassic";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

// Full-bleed photography, ultra-light display type, and a technical mono eyebrow
// label — the Nova theme's signature "engineered" tech-commerce look. A subtle
// dot-grid texture (plain CSS, no image asset) reinforces the technical feel.
// Layout only; colors come from the merchant's theme-seeded CSS vars like every
// other theme.
export function HeroNova({ restaurant, reviews, todayHoursText, isOpen, t, shopHref }: StorefrontHeroProps) {
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <div className="relative h-[75vh] min-h-[460px] max-h-[760px] overflow-hidden bg-foreground">
      {restaurant.coverImageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${restaurant.coverImageUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-black" />
      )}
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <motion.div
        className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6"
        initial="hidden"
        animate="show"
        variants={staggerContainer}
      >
        {reviews.length > 0 && (
          <motion.div variants={fadeUp} className="flex items-center gap-1 mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/80">
            <Star className="h-3 w-3 fill-white text-white" />
            {avgRating.toFixed(1)} ({reviews.length})
          </motion.div>
        )}

        <motion.h1
          variants={fadeUp}
          className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-white max-w-4xl"
        >
          {restaurant.name}
        </motion.h1>

        {restaurant.description && (
          <motion.p variants={fadeUp} className="mt-5 max-w-xl text-white/70 text-base md:text-lg font-light">
            {restaurant.description}
          </motion.p>
        )}

        {shopHref && (
          <motion.div variants={fadeUp} className="mt-8">
            <Link href={shopHref}>
              <Button
                size="lg"
                className="rounded-none bg-white text-black hover:bg-white/90 px-10 font-mono text-xs uppercase tracking-widest"
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
