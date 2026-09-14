import { Link } from "wouter";
import { Search, User, ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HeaderFields {
  logoUrl?: string | null;
  nav: Array<{ label: string; type: string; value?: string }>;
  showSearch: boolean;
  showAccount: boolean;
  showCart: boolean;
}

export function Header({ storeName, slug, fields, cartCount, onOpenCart }: {
  storeName: string;
  slug: string;
  fields: HeaderFields;
  cartCount: number;
  onOpenCart: () => void;
}) {
  const base = `/store/${slug}`;
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href={base} className="flex items-center gap-2 shrink-0">
          {fields.logoUrl ? (
            <img src={fields.logoUrl} alt={storeName} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <Store className="h-6 w-6 text-primary" />
          )}
          <span className="font-display text-lg font-bold truncate">{storeName}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {(fields.nav || []).map((item, i) => (
            <a
              key={i}
              href={item.type === "shop" ? `${base}/shop` : base}
              className="rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          {fields.showSearch && (
            <Button variant="ghost" size="icon" data-testid="button-storefront-search"><Search className="h-4 w-4" /></Button>
          )}
          {fields.showAccount && (
            <Button variant="ghost" size="icon" data-testid="button-storefront-account"><User className="h-4 w-4" /></Button>
          )}
          {fields.showCart && (
            <Button variant="ghost" size="icon" className="relative" onClick={onOpenCart} data-testid="button-storefront-cart">
              <ShoppingBag className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
