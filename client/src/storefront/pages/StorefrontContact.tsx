import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { RestaurantThemeSettings } from "@shared/schema";
import { storefrontColorVars } from "@/storefront/lib/colorUtils";
import { useCart } from "@/storefront/lib/cartStore";
import { Header } from "@/storefront/components/Header";
import { Footer } from "@/storefront/components/Footer";
import { CartDrawer } from "@/storefront/components/CartDrawer";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { convertAndFormatPrice } from "@/lib/currency";

interface StorefrontRestaurant {
  name: string;
  currency: string;
  themeSettings: RestaurantThemeSettings | null;
  socialLinks: Record<string, string> | null;
}

export function StorefrontContact({ slug }: { slug: string }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const cart = useCart(slug);
  const { toast } = useToast();
  const base = `/store/${slug}`;

  const { data: restaurant } = useQuery<StorefrontRestaurant>({ queryKey: [`/api/storefront/${slug}`] });
  const formatPrice = (n: number) => convertAndFormatPrice(n, restaurant?.currency || "USD", null);
  const headerSection = restaurant?.themeSettings?.layout?.sections?.find((s) => s.type === "header");
  const footerSection = restaurant?.themeSettings?.layout?.sections?.find((s) => s.type === "footer");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setIsSubmitting(true);
    try {
      await apiRequest(`/api/storefront/${slug}/contact`, "POST", {
        name: String(data.get("name") || ""),
        email: String(data.get("email") || ""),
        subject: String(data.get("subject") || "") || undefined,
        message: String(data.get("message") || ""),
      });
      setSent(true);
      form.reset();
    } catch {
      toast({ variant: "destructive", title: "Something went wrong", description: "Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" style={storefrontColorVars()}>
      {headerSection && restaurant && (
        <Header storeName={restaurant.name} slug={slug} fields={headerSection.fields as any} cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
      )}
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link href={base} className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Contact</span>
        </nav>
        <h1 className="mb-3 font-serif text-3xl font-normal tracking-tight sm:text-4xl">Contact us</h1>
        <p className="mb-10 text-[15px] text-muted-foreground">
          Have a question about an order or a product? Send us a message and we'll get back to you.
        </p>

        {sent ? (
          <div className="border border-border py-10 text-center">
            <p className="text-[15px]">Thanks for reaching out — we'll reply as soon as we can.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-normal uppercase tracking-[0.1em] text-muted-foreground">Name</label>
                <input name="name" type="text" required className="w-full border-0 border-b border-border bg-transparent py-2 text-[15px] outline-none focus:border-foreground" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-normal uppercase tracking-[0.1em] text-muted-foreground">Email</label>
                <input name="email" type="email" required className="w-full border-0 border-b border-border bg-transparent py-2 text-[15px] outline-none focus:border-foreground" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-normal uppercase tracking-[0.1em] text-muted-foreground">Subject</label>
              <input name="subject" type="text" className="w-full border-0 border-b border-border bg-transparent py-2 text-[15px] outline-none focus:border-foreground" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-normal uppercase tracking-[0.1em] text-muted-foreground">Message</label>
              <textarea name="message" required rows={5} className="w-full resize-none border-0 border-b border-border bg-transparent py-2 text-[15px] outline-none focus:border-foreground" />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="h-11 rounded-none px-8 text-[13px] font-normal uppercase tracking-[0.1em]"
            >
              {isSubmitting ? "Sending..." : "Send message"}
            </Button>
          </form>
        )}
      </main>
      {footerSection && restaurant && (
        <Footer fields={footerSection.fields as any} storeName={restaurant.name} socialLinks={restaurant.socialLinks} slug={slug} />
      )}
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={cart.items}
        formatPrice={formatPrice}
        subtotalCents={cart.subtotalCents}
        onSetQty={cart.setQty}
        onRemove={cart.removeItem}
      />
    </div>
  );
}
