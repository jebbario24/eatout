import { motion } from "framer-motion";

export interface AboutUsFields {
  heading: string;
  body: string;
  imageUrl?: string | null;
}

export function AboutUs({ fields }: { fields: AboutUsFields }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8" data-testid="section-about-us">
      <div className="grid items-center gap-14 md:grid-cols-2">
        {fields.imageUrl && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="aspect-[4/5] overflow-hidden bg-muted"
          >
            <img src={fields.imageUrl} alt={fields.heading} className="h-full w-full object-cover" />
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className={fields.imageUrl ? "" : "mx-auto max-w-2xl text-center"}
        >
          <p className="mb-3 text-xs font-normal uppercase tracking-[0.2em] text-muted-foreground">Our story</p>
          <h2 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">{fields.heading}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">{fields.body}</p>
        </motion.div>
      </div>
    </div>
  );
}
