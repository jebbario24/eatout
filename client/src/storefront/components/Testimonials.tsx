import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import type { CustomerReview } from "@shared/schema";

export interface TestimonialsFields {
  heading: string;
}

// Always sourced from real, published reviews — never invented copy. The
// section itself is only ever rendered when there are >=3 reviews rated >=4
// (enforced by the caller / generation engine), so an empty state here is not
// expected in normal operation, but we still degrade gracefully if it happens.
export function Testimonials({ fields, reviews }: { fields: TestimonialsFields; reviews: CustomerReview[] }) {
  const featured = reviews.filter((r) => r.rating >= 4).slice(0, 6);
  if (featured.length === 0) return null;
  return (
    <div className="bg-muted py-24" data-testid="section-testimonials">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-12 text-center font-serif text-3xl font-normal tracking-tight sm:text-4xl">{fields.heading}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="flex flex-col gap-4 bg-background p-7"
            >
              <Quote className="h-5 w-5 text-muted-foreground/50" fill="currentColor" />
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`h-3.5 w-3.5 ${j < review.rating ? "fill-foreground text-foreground" : "text-muted-foreground/40"}`} />
                ))}
              </div>
              {review.comment && <p className="text-[15px] leading-relaxed">{review.comment}</p>}
              <p className="mt-auto text-xs font-medium uppercase tracking-wide text-muted-foreground">{review.customerName}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
