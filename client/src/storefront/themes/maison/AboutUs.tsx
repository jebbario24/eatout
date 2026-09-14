import { motion } from "framer-motion";
import type { AboutUsFields } from "@/storefront/components/AboutUs";

export function AboutUs({ fields }: { fields: AboutUsFields }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8" data-testid="section-about-us">
      <div className="grid items-center gap-12 md:grid-cols-2">
        {fields.imageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6 }}
            className="aspect-[4/5] overflow-hidden rounded-3xl bg-muted"
          >
            <img src={fields.imageUrl} alt={fields.heading} className="h-full w-full object-cover" />
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={fields.imageUrl ? "" : "mx-auto max-w-2xl text-center"}
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">Our story</p>
          <h2 className="font-serif text-3xl italic tracking-tight text-foreground sm:text-4xl">{fields.heading}</h2>
          <p className="mt-5 text-[16px] leading-relaxed text-muted-foreground" style={{ fontFamily: "Lora, Georgia, serif" }}>
            {fields.body}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
