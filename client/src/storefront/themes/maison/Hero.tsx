import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { HeroFields } from "@/storefront/components/Hero";

export function Hero({ fields, shopHref }: { fields: HeroFields; shopHref: string }) {
  const alignClass = fields.textAlign === "center" ? "items-center text-center" : fields.textAlign === "right" ? "items-end text-right" : "items-start text-left";
  return (
    <div
      className="relative flex h-[75vh] min-h-[480px] w-full flex-col justify-end overflow-hidden bg-cover bg-center px-6 pb-16 sm:px-10"
      style={fields.backgroundImageUrl ? { backgroundImage: `url(${fields.backgroundImageUrl})` } : { background: "linear-gradient(135deg, hsl(var(--primary)/0.6), hsl(var(--secondary)/0.9))" }}
      data-testid="storefront-hero"
    >
      {fields.backgroundImageUrl && (
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,${((fields.overlayOpacity ?? 20) / 100) + 0.2}) 0%, transparent 70%)` }} />
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className={`relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5 ${alignClass}`}
      >
        <h1 className={`max-w-xl font-serif text-4xl italic leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl ${fields.backgroundImageUrl ? "text-white" : "text-foreground"}`}>
          {fields.heading}
        </h1>
        {fields.subheading && (
          <p className={`max-w-md text-[15px] ${fields.backgroundImageUrl ? "text-white/90" : "text-foreground/80"}`} style={{ fontFamily: "Lora, Georgia, serif" }}>
            {fields.subheading}
          </p>
        )}
        {fields.buttonText && (
          <a href={shopHref} className="mt-2">
            <Button
              size="lg"
              className="h-12 rounded-full bg-primary px-9 text-primary-foreground hover:bg-primary/90"
              data-testid="button-hero-cta"
            >
              {fields.buttonText}
            </Button>
          </a>
        )}
      </motion.div>
    </div>
  );
}
