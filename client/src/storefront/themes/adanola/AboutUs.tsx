import { motion } from "framer-motion";
import type { AboutUsFields } from "@/storefront/components/AboutUs";

export function AboutUs({ fields }: { fields: AboutUsFields }) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8" data-testid="section-about-us">
      <div className="grid items-center gap-8 md:grid-cols-2">
        {fields.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="aspect-square overflow-hidden bg-[hsl(var(--muted))]"
          >
            <img src={fields.imageUrl} alt={fields.heading} className="h-full w-full object-cover" />
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={fields.imageUrl ? "" : "mx-auto max-w-2xl text-center"}
        >
          <h2 className="text-xl font-bold text-foreground">{fields.heading}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{fields.body}</p>
        </motion.div>
      </div>
    </div>
  );
}
