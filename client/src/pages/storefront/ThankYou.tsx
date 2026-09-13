import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useResolvedSlug } from "@/hooks/useResolvedSlug";
import { useStorefrontCart } from "@/hooks/useStorefrontCart";
import { useStorefrontMarket } from "@/hooks/useStorefrontMarket";
import { useStorefrontCustomer } from "@/hooks/useStorefrontCustomer";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
import { StorefrontBrandStyle } from "@/components/storefront/StorefrontBrandStyle";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, PackageSearch } from "lucide-react";
import type { Restaurant } from "@shared/schema";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

// Real "thank you" page shown right after checkout — the order id in the URL
// (an unguessable UUID) is the access control, same convention as every major
// checkout's confirmation link. Replaces the toast-only success state.
export default function ThankYou() {
  const { orderId } = useParams<{ orderId: string }>();
  const slug = useResolvedSlug();
  const { cart, setCart } = useStorefrontCart(slug);

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: [`/api/storefront/${slug}`],
    enabled: !!slug,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}`);
      if (!r.ok) throw new Error("Store not found");
      return r.json();
    },
  });
  const { customer: sfCustomer } = useStorefrontCustomer(slug);
  const { markets, selectedMarketName, handleSelectMarket, formatPrice } = useStorefrontMarket(slug, restaurant?.currency);

  const { data: confirmation, isLoading, isError } = useQuery<{
    order: {
      orderNumber: string;
      orderType: string;
      total: string;
      subtotal: string;
      tax: string;
      shippingFee: string | null;
      customerName: string | null;
      deliveryAddress: string | null;
      pickupAddress: string | null;
    };
    items: Array<{ id: string; quantity: number; unitPrice: string; variantName?: string | null; menuItem?: { name: string } | null; bundle?: { name: string } | null }>;
  }>({
    queryKey: [`/api/storefront/${slug}/orders/${orderId}/confirmation`],
    enabled: !!slug && !!orderId,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}/orders/${orderId}/confirmation`);
      if (!r.ok) throw new Error("Order not found");
      return r.json();
    },
  });

  const shopHref = slug ? `/store/${slug}/shop` : "/shop";
  const trackHref = slug ? `/store/${slug}/track` : "/track";
  const accountHref = slug ? `/store/${slug}/account` : "/account";
  const cartItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <StorefrontBrandStyle restaurant={restaurant} themeId={(restaurant as any)?.themeSettings?.themeId} />
      {restaurant && (
        <StorefrontHeader
          restaurant={restaurant}
          markets={markets}
          selectedMarketName={selectedMarketName}
          onSelectMarket={handleSelectMarket}
          sfCustomer={sfCustomer}
          accountHref={accountHref}
          trackHref={trackHref}
          cartItemCount={cartItemCount}
          onOpenAuth={() => {}}
          onOpenCart={() => {}}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError || !confirmation ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">We couldn't find that order.</p>
            <Link href={slug ? `/store/${slug}` : "/"}>
              <Button variant="outline" className="mt-4">Back to store</Button>
            </Link>
          </div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={staggerContainer} className="text-center">
            <motion.div variants={fadeUp} className="flex justify-center mb-5">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9 text-primary" />
              </div>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-2xl sm:text-3xl font-display font-bold">
              Thank you{confirmation.order.customerName ? `, ${confirmation.order.customerName.split(" ")[0]}` : ""}!
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground mt-2">
              Your order <span className="font-medium text-foreground">#{confirmation.order.orderNumber}</span> has been placed.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 rounded-lg border text-left overflow-hidden">
              <div className="divide-y">
                {confirmation.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <span className="font-medium">{item.menuItem?.name || item.bundle?.name}</span>
                      {item.variantName && <span className="text-muted-foreground"> — {item.variantName}</span>}
                      <span className="text-muted-foreground"> × {item.quantity}</span>
                    </div>
                    <span>{formatPrice(parseFloat(item.unitPrice) * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t bg-muted/30 px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(confirmation.order.subtotal)}</span>
                </div>
                {!!parseFloat(confirmation.order.shippingFee || "0") && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>{formatPrice(confirmation.order.shippingFee || "0")}</span>
                  </div>
                )}
                {!!parseFloat(confirmation.order.tax) && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span>{formatPrice(confirmation.order.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base pt-1">
                  <span>Total</span>
                  <span>{formatPrice(confirmation.order.total)}</span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={trackHref}>
                <Button variant="outline" className="w-full sm:w-auto">
                  <PackageSearch className="h-4 w-4 mr-2" />
                  Track order
                </Button>
              </Link>
              <Link href={shopHref}>
                <Button className="w-full sm:w-auto">Continue shopping</Button>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
