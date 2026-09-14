import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface NewsletterFields {
  heading: string;
  subheading: string;
}

export function Newsletter({ fields, slug }: { fields: NewsletterFields; slug: string }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.5 }}
      className="border-t border-border py-24"
      data-testid="section-newsletter"
    >
      <div className="mx-auto max-w-lg px-4 text-center">
        <h2 className="font-serif text-2xl font-normal tracking-tight sm:text-3xl">{fields.heading}</h2>
        {fields.subheading && <p className="mt-3 text-sm text-muted-foreground">{fields.subheading}</p>}
        <form
          className="mx-auto mt-8 flex max-w-sm items-center border-b border-border pb-2 focus-within:border-foreground"
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
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button type="submit" disabled={isSubmitting} className="shrink-0 p-1 disabled:opacity-50" aria-label="Subscribe">
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
