import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export interface HeroFields {
  backgroundImageUrl?: string | null;
  heading: string;
  subheading: string;
  buttonText: string;
  buttonStyle: "solid" | "outline";
  textAlign: "left" | "center" | "right";
  overlayOpacity: number;
}

export function Hero({ fields, shopHref }: { fields: HeroFields; shopHref: string }) {
  const alignClass = fields.textAlign === "center" ? "items-center text-center" : fields.textAlign === "right" ? "items-end text-right" : "items-start text-left";
  const gradientDir = fields.textAlign === "right" ? "to top left" : fields.textAlign === "center" ? "to top" : "to top right";
  return (
    <div
      className="relative flex h-[82vh] min-h-[520px] w-full flex-col justify-end overflow-hidden bg-cover bg-center px-6 pb-16 sm:px-10"
      style={fields.backgroundImageUrl ? { backgroundImage: `url(${fields.backgroundImageUrl})` } : { background: "linear-gradient(135deg, hsl(var(--foreground)/0.92), hsl(var(--foreground)/0.75))" }}
      data-testid="storefront-hero"
    >
      {fields.backgroundImageUrl && (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(${gradientDir}, rgba(0,0,0,${((fields.overlayOpacity ?? 20) / 100) + 0.25}) 0%, rgba(0,0,0,${(fields.overlayOpacity ?? 20) / 100}) 45%, transparent 85%)` }}
        />
      )}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className={`relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5 ${alignClass}`}
      >
        <h1 className="max-w-2xl font-serif text-5xl font-normal leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
          {fields.heading}
        </h1>
        {fields.subheading && (
          <p className="max-w-lg text-base font-light text-white/85 sm:text-lg">{fields.subheading}</p>
        )}
        {fields.buttonText && (
          <a href={shopHref} className="mt-2">
            <Button
              size="lg"
              variant="ghost"
              className={
                fields.buttonStyle === "outline"
                  ? "h-12 rounded-none border border-white px-8 text-[13px] font-normal uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-black"
                  : "h-12 rounded-none border border-white bg-white px-8 text-[13px] font-normal uppercase tracking-[0.1em] text-black transition-colors hover:bg-transparent hover:text-white"
              }
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
