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
      transition={{ duration: 0.5 }}
      className="relative flex h-[50vh] min-h-[320px] w-full items-center justify-center overflow-hidden bg-cover bg-center text-center"
      style={fields.imageUrl ? { backgroundImage: `url(${fields.imageUrl})` } : { background: "hsl(var(--muted))" }}
      data-testid="storefront-banner"
    >
      <div className="relative z-10 space-y-4 px-4">
        {fields.heading && (
          <h2 className={`text-xl font-normal uppercase tracking-wide sm:text-2xl ${fields.imageUrl ? "text-white" : "text-foreground"}`}>
            {fields.heading}
          </h2>
        )}
        {fields.buttonText && (
          <a href={fields.buttonUrl || "#"}>
            <Button
              size="default"
              variant="ghost"
              className={`h-9 rounded border px-6 text-xs font-medium uppercase tracking-wide transition-colors ${
                fields.imageUrl
                  ? "border-white text-white hover:bg-white hover:text-black"
                  : "border-foreground text-foreground hover:bg-foreground hover:text-background"
              }`}
            >
              {fields.buttonText}
            </Button>
          </a>
        )}
      </div>
    </motion.div>
  );
}
