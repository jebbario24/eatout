import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import type { CustomerReview } from "@shared/schema";
import type { TestimonialsFields } from "@/storefront/components/Testimonials";

export function Testimonials({ fields, reviews }: { fields: TestimonialsFields; reviews: CustomerReview[] }) {
  const featured = reviews.filter((r) => r.rating >= 4).slice(0, 6);
  if (featured.length === 0) return null;
  return (
    <div className="py-20" data-testid="section-testimonials">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-12 text-center font-serif text-3xl italic tracking-tight text-foreground sm:text-4xl">{fields.heading}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="flex flex-col gap-4 rounded-2xl bg-muted p-7"
            >
              <Quote className="h-5 w-5 text-primary/50" fill="currentColor" />
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`h-3.5 w-3.5 ${j < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                ))}
              </div>
              {review.comment && (
                <p className="text-[15px] leading-relaxed text-foreground" style={{ fontFamily: "Lora, Georgia, serif" }}>
                  {review.comment}
                </p>
              )}
              <p className="mt-auto text-xs font-medium uppercase tracking-wide text-muted-foreground">{review.customerName}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
