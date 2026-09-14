import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { CustomerReview } from "@shared/schema";
import type { TestimonialsFields } from "@/storefront/components/Testimonials";

export function Testimonials({ fields, reviews }: { fields: TestimonialsFields; reviews: CustomerReview[] }) {
  const featured = reviews.filter((r) => r.rating >= 4).slice(0, 6);
  if (featured.length === 0) return null;
  return (
    <div className="bg-[hsl(var(--muted))] py-12" data-testid="section-testimonials">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-xl font-bold text-foreground">{fields.heading}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="flex flex-col gap-3 bg-background p-4"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`h-3 w-3 ${j < review.rating ? "fill-foreground text-foreground" : "text-muted-foreground/40"}`} />
                ))}
              </div>
              {review.comment && <p className="text-sm leading-relaxed text-foreground">{review.comment}</p>}
              <p className="mt-auto text-xs font-medium uppercase tracking-wide text-muted-foreground">{review.customerName}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
