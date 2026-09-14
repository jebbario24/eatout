import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    <div className="border-t py-14" data-testid="section-newsletter">
      <div className="mx-auto max-w-md px-4 text-center space-y-4">
        <h2 className="font-display text-2xl font-bold">{fields.heading}</h2>
        {fields.subheading && <p className="text-muted-foreground">{fields.subheading}</p>}
        <form
          className="flex gap-2"
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
          <Input name="email" type="email" placeholder="Enter your email" required />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "..." : "Subscribe"}</Button>
        </form>
      </div>
    </div>
  );
}
