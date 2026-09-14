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
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.4 }}
      className="border-t border-[hsl(var(--card-border))] py-12"
      data-testid="section-newsletter"
    >
      <div className="mx-auto max-w-md px-4 text-center">
        <h2 className="text-xl font-bold text-foreground">{fields.heading}</h2>
        {fields.subheading && <p className="mt-2 text-sm text-muted-foreground">{fields.subheading}</p>}
        <form
          className="mx-auto mt-6 flex max-w-sm gap-2"
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
            className="h-9 flex-1 rounded border border-[hsl(var(--input))] bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
          />
          <Button type="submit" disabled={isSubmitting} size="default" className="h-9 rounded px-4 text-xs font-medium uppercase tracking-wide">
            {isSubmitting ? "..." : "Subscribe"}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
