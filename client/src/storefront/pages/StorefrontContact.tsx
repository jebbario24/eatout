import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { MerchantThemeSettings } from "@shared/schema";
import { storefrontColorVars } from "@/storefront/lib/colorUtils";
import { useCart } from "@/storefront/lib/cartStore";
import { STOREFRONT_THEMES, resolveTheme } from "@/storefront/themeRegistry";
import { CartDrawer } from "@/storefront/components/CartDrawer";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { convertAndFormatPrice } from "@/lib/currency";
import { PixelScripts } from "@/components/PixelScripts";

interface StorefrontMerchant {
  name: string;
  currency: string;
  themeSettings: MerchantThemeSettings | null;
  socialLinks: Record<string, string> | null;
  metaPixelId?: string | null;
  tiktokPixelId?: string | null;
  googleAnalyticsId?: string | null;
  googleAdsId?: string | null;
}

const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";

export function StorefrontContact({ slug }: { slug: string }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [draft, setDraft] = useState<{ themeSettings?: MerchantThemeSettings } | null>(null);
  const cart = useCart(slug);
  const { toast } = useToast();
  const base = `/store/${slug}`;

  const { data: merchant } = useQuery<StorefrontMerchant>({ queryKey: [`/api/storefront/${slug}`] });

  useEffect(() => {
    if (!isPreview) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "STOREFRONT_DRAFT_UPDATE") {
        setDraft({ themeSettings: event.data.themeSettings });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const themeSettings = draft?.themeSettings || merchant?.themeSettings;
  const formatPrice = (n: number) => convertAndFormatPrice(n, merchant?.currency || "USD", null);
  const theme = resolveTheme(themeSettings?.theme);
  const T = STOREFRONT_THEMES[theme];
  const headerSection = themeSettings?.layout?.sections?.find((s) => s.type === "header");
  const footerSection = themeSettings?.layout?.sections?.find((s) => s.type === "footer");
  const isAdanola = theme === "adanola";
  const isMaison = theme === "maison";
  const contactPage = themeSettings?.contactPage || {};
  const heading = contactPage.heading?.trim() || "Contact us";
  const description = contactPage.description?.trim() || "Have a question about an order or a product? Send us a message and we'll get back to you.";
  const submitButtonText = contactPage.submitButtonText?.trim() || "Send message";

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

  const inputClass = isAdanola
    ? "w-full rounded border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground"
    : isMaison
    ? "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
    : "w-full border-0 border-b border-border bg-transparent py-2 text-[15px] outline-none focus:border-foreground";
  const labelClass = isAdanola
    ? "mb-1.5 block text-xs font-bold uppercase tracking-wide text-foreground"
    : isMaison
    ? "mb-1.5 block text-xs font-medium uppercase tracking-[0.1em] text-primary"
    : "mb-1.5 block text-xs font-normal uppercase tracking-[0.1em] text-muted-foreground";

  return (
    <div className="min-h-screen bg-background" style={storefrontColorVars(theme)}>
      {!isPreview && merchant && (
        <PixelScripts
          metaPixelId={merchant.metaPixelId || undefined}
          tiktokPixelId={merchant.tiktokPixelId || undefined}
          googleAnalyticsId={merchant.googleAnalyticsId || undefined}
          googleAdsId={merchant.googleAdsId || undefined}
        />
      )}
      {headerSection && merchant && (
        <T.Header storeName={merchant.name} slug={slug} fields={headerSection.fields as any} cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
      )}
      <main className={`mx-auto max-w-xl px-4 sm:px-6 lg:px-8 ${isAdanola ? "py-8" : "py-10"}`}>
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link href={base} className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Contact</span>
        </nav>
        <h1 className={isAdanola ? "mb-3 text-2xl font-bold text-foreground" : isMaison ? "mb-3 font-serif text-3xl italic tracking-tight sm:text-4xl" : "mb-3 font-serif text-3xl font-normal tracking-tight sm:text-4xl"}>
          {heading}
        </h1>
        <p className="mb-10 text-[15px] text-muted-foreground">
          {description}
        </p>

        {sent ? (
          <div className={`py-10 text-center ${isAdanola ? "rounded border border-[hsl(var(--card-border))]" : isMaison ? "rounded-2xl border border-border bg-muted" : "border border-border"}`}>
            <p className="text-[15px]">Thanks for reaching out — we'll reply as soon as we can.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Name</label>
                <input name="name" type="text" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input name="email" type="email" required className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Subject</label>
              <input name="subject" type="text" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Message</label>
              <textarea name="message" required rows={5} className={`resize-none ${inputClass}`} />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className={isAdanola ? "h-11 rounded px-8 text-xs font-medium uppercase tracking-wide" : isMaison ? "h-11 rounded-full bg-primary px-8 text-primary-foreground hover:bg-primary/90" : "h-11 rounded-none px-8 text-[13px] font-normal uppercase tracking-[0.1em]"}
            >
              {isSubmitting ? "Sending..." : submitButtonText}
            </Button>
          </form>
        )}
      </main>
      {footerSection && merchant && (
        <T.Footer fields={footerSection.fields as any} storeName={merchant.name} socialLinks={merchant.socialLinks} slug={slug} />
      )}
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={cart.items}
        formatPrice={formatPrice}
        subtotalCents={cart.subtotalCents}
        onSetQty={cart.setQty}
        onRemove={cart.removeItem}
        slug={slug}
      />
    </div>
  );
}
