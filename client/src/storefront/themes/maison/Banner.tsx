import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { BannerFields } from "@/storefront/components/Banner";

export function Banner({ fields }: { fields: BannerFields }) {
  if (!fields.heading && !fields.imageUrl) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6 }}
      className="relative mx-4 flex h-72 items-center justify-center overflow-hidden rounded-3xl bg-cover bg-center text-center sm:mx-6 lg:mx-auto lg:max-w-7xl"
      style={fields.imageUrl ? { backgroundImage: `url(${fields.imageUrl})` } : { background: "linear-gradient(135deg, hsl(var(--primary)/0.5), hsl(var(--secondary)))" }}
      data-testid="storefront-banner"
    >
      {fields.imageUrl && <div className="absolute inset-0 bg-black/25" />}
      <div className="relative z-10 space-y-4 px-4">
        {fields.heading && (
          <h2 className={`font-serif text-2xl italic tracking-tight sm:text-3xl ${fields.imageUrl ? "text-white" : "text-foreground"}`}>
            {fields.heading}
          </h2>
        )}
        {fields.buttonText && (
          <a href={fields.buttonUrl || "#"}>
            <Button size="lg" className="h-11 rounded-full bg-primary px-8 text-primary-foreground hover:bg-primary/90">
              {fields.buttonText}
            </Button>
          </a>
        )}
      </div>
    </motion.div>
  );
}
