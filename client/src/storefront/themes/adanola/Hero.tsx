import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { HeroFields } from "@/storefront/components/Hero";

export function Hero({ fields, shopHref }: { fields: HeroFields; shopHref: string }) {
  const split = !!fields.secondaryImageUrl;
  return (
    <div className="relative w-full" data-testid="storefront-hero">
      <div className="flex h-[70vh] min-h-[420px] w-full">
        <div
          className={`bg-cover bg-center ${split ? "w-1/2" : "w-full"}`}
          style={fields.backgroundImageUrl ? { backgroundImage: `url(${fields.backgroundImageUrl})` } : { background: "hsl(var(--foreground) / 0.85)" }}
        />
        {split && (
          <div
            className="w-1/2 bg-cover bg-center"
            style={fields.secondaryImageUrl ? { backgroundImage: `url(${fields.secondaryImageUrl})` } : { background: "hsl(var(--foreground) / 0.7)" }}
          />
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <h1 className="max-w-lg text-2xl font-normal uppercase tracking-wide text-white sm:text-3xl">
          {fields.heading}
        </h1>
        {fields.subheading && <p className="max-w-md text-sm text-white/90">{fields.subheading}</p>}
        {fields.buttonText && (
          <a href={shopHref} className="pointer-events-auto mt-1">
            <Button
              size="default"
              variant="ghost"
              className="h-9 rounded border border-white bg-transparent px-6 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-black"
              data-testid="button-hero-cta"
            >
              {fields.buttonText}
            </Button>
          </a>
        )}
      </motion.div>

      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-1.5">
        <span className="h-0.5 w-7 bg-foreground" />
        <span className="h-0.5 w-7 bg-[hsl(var(--card-border))]" />
      </div>
    </div>
  );
}
