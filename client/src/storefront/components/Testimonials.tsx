import { Star } from "lucide-react";
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
    <div className="bg-muted/30 py-14" data-testid="section-testimonials">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center font-display text-2xl font-bold sm:text-3xl">{fields.heading}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((review) => (
            <div key={review.id} className="rounded-lg border bg-background p-6 space-y-3">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                ))}
              </div>
              {review.comment && <p className="text-sm italic">"{review.comment}"</p>}
              <p className="text-sm font-semibold">{review.customerName}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
