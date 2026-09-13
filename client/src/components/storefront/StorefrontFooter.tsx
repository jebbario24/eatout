import { SiPaypal } from "react-icons/si";
import { Banknote } from "lucide-react";

export interface StorefrontFooterPage {
  id: string;
  title: string;
  handle: string;
  footerGroup?: string | null;
}

export interface StorefrontFooterProps {
  pages: StorefrontFooterPage[];
  hrefFor: (page: StorefrontFooterPage) => string;
  enabledPaymentMethods?: { paypal?: boolean; cash?: boolean } | null;
  restaurantName?: string;
}

// Grouped-columns footer — rendered only once a merchant assigns at least one page
// to a footerGroup (each consumer keeps its own original flat single-row footer,
// unchanged, for the common case of zero groups, so nothing regresses for
// merchants who never touch this feature).
export function StorefrontFooter({ pages, hrefFor, enabledPaymentMethods, restaurantName }: StorefrontFooterProps) {
  const groups = new Map<string, StorefrontFooterPage[]>();
  const ungrouped: StorefrontFooterPage[] = [];
  for (const p of pages) {
    if (p.footerGroup) {
      const arr = groups.get(p.footerGroup) || [];
      arr.push(p);
      groups.set(p.footerGroup, arr);
    } else {
      ungrouped.push(p);
    }
  }

  const hasPaymentRow = !!(enabledPaymentMethods?.paypal || enabledPaymentMethods?.cash);

  return (
    <div className="border-t" data-testid="storefront-footer-grouped">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from(groups.entries()).map(([label, groupPages]) => (
          <div key={label} className="space-y-2">
            <h3 className="text-sm font-semibold">{label}</h3>
            <ul className="space-y-1.5">
              {groupPages.map((p) => (
                <li key={p.id}>
                  <a href={hrefFor(p)} className="text-sm text-muted-foreground hover:text-foreground">{p.title}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {ungrouped.length > 0 && (
          <div className="space-y-2">
            {groups.size > 0 && <h3 className="text-sm font-semibold">More</h3>}
            <ul className="space-y-1.5">
              {ungrouped.map((p) => (
                <li key={p.id}>
                  <a href={hrefFor(p)} className="text-sm text-muted-foreground hover:text-foreground">{p.title}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {hasPaymentRow && (
        <div className="border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4 text-muted-foreground">
            <span className="text-xs">We accept</span>
            {enabledPaymentMethods?.paypal && <SiPaypal className="h-5 w-5" data-testid="footer-payment-paypal" />}
            {enabledPaymentMethods?.cash && <Banknote className="h-5 w-5" data-testid="footer-payment-cash" />}
          </div>
        </div>
      )}

      {restaurantName && (
        <div className="border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} {restaurantName}. Powered by EatOut.
          </div>
        </div>
      )}
    </div>
  );
}
