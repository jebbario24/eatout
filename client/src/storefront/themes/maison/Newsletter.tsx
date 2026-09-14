import { useState } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import type { NewsletterFields } from "@/storefront/components/Newsletter";

export function Newsletter({ fields, slug }: { fields: NewsletterFields; slug: string }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.5 }}
      className="bg-secondary/40 py-20"
      data-testid="section-newsletter"
    >
      <div className="mx-auto max-w-md px-4 text-center">
        <h2 className="font-serif text-2xl italic tracking-tight text-foreground sm:text-3xl">{fields.heading}</h2>
        {fields.subheading && <p className="mt-3 text-sm text-muted-foreground">{fields.subheading}</p>}
        <form
          className="mx-auto mt-7 flex max-w-sm gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const email = (new FormData(e.currentTarget).get("email") as string) || "";
            if (!email) return;
            setIsSubmitting(true);
            try {
              await apiRequest(`/api/storefront/${slug}/newsletter`, "POST", { email });
              toast({ title: "Thanks for subscribing!" });
              e.currentTarget.reset();
            } catch {
              toast({ variant: "destructive", title: "Something went wrong", description: "Please try again." });
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <input
            name="email"
            type="email"
            placeholder="Enter your email"
            required
            className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <Button type="submit" disabled={isSubmitting} className="h-11 shrink-0 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90">
            {isSubmitting ? "..." : "Subscribe"}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
