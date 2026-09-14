import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export interface BannerFields {
  imageUrl?: string | null;
  heading: string;
  buttonText: string;
  buttonUrl: string;
}

export function Banner({ fields }: { fields: BannerFields }) {
  if (!fields.heading && !fields.imageUrl) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6 }}
      className="relative flex h-80 w-full items-center justify-center overflow-hidden bg-cover bg-center text-center"
      style={fields.imageUrl ? { backgroundImage: `url(${fields.imageUrl})` } : { background: "linear-gradient(135deg, hsl(var(--accent)/0.35), hsl(var(--accent)/0.1))" }}
    >
      {fields.imageUrl && <div className="absolute inset-0 bg-black/35" />}
      <div className="relative z-10 space-y-4 px-4">
        {fields.heading && (
          <h2 className={`font-serif text-3xl font-normal tracking-tight sm:text-4xl ${fields.imageUrl ? "text-white" : ""}`}>
            {fields.heading}
          </h2>
        )}
        {fields.buttonText && (
          <a href={fields.buttonUrl || "#"}>
            <Button
              size="lg"
              variant="ghost"
              className={`h-11 rounded-none border px-7 text-[13px] font-normal uppercase tracking-[0.1em] transition-colors ${
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
