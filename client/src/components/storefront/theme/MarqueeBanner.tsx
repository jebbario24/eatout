import { motion } from "framer-motion";
import type { Restaurant } from "@shared/schema";

interface MarqueeBannerProps {
  restaurant: Restaurant;
}

// Infinite horizontal scroll of repeated text — the editorial theme's signature
// banner. Content is duplicated once so the loop wraps seamlessly.
export function MarqueeBanner({ restaurant }: MarqueeBannerProps) {
  const announcement = (restaurant as any)?.announcement?.text as string | undefined;
  const phrases = [
    announcement || restaurant.description || `Welcome to ${restaurant.name}`,
    "Fresh drops, always in season",
    "Crafted with care",
  ].filter(Boolean);
  const text = phrases.join("   •   ");

  return (
    <div className="overflow-hidden bg-foreground text-background py-3 border-y">
      <motion.div
        className="flex whitespace-nowrap text-sm font-medium tracking-wide uppercase"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      >
        <span className="px-6">{text}</span>
        <span className="px-6">{text}</span>
        <span className="px-6">{text}</span>
        <span className="px-6">{text}</span>
      </motion.div>
    </div>
  );
}
