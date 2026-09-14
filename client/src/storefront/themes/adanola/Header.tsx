import { Link } from "wouter";
import { Heart, Search, User, ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HeaderFields } from "@/storefront/components/Header";

export function Header({ storeName, slug, fields, cartCount, onOpenCart }: {
  storeName: string;
  slug: string;
  fields: HeaderFields;
  cartCount: number;
  onOpenCart: () => void;
}) {
  const base = `/store/${slug}`;
  const navHref = (item: { type: string; value?: string }) => {
    if (item.type === "shop") return `${base}/shop`;
    if (item.type === "contact") return `${base}/contact`;
    if (item.type === "page" && item.value) return `${base}/pages/${item.value}`;
    return base;
  };
  return (
    <div className="sticky top-0 z-40">
      {fields.announcementText && (
        <div className="bg-foreground px-4 py-1.5 text-center text-[9px] font-normal uppercase tracking-[0.1em] text-background">
          {fields.announcementText}
        </div>
      )}
      <header className="border-b border-border bg-background">
        <div className="mx-auto grid h-14 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <nav className="hidden items-center gap-5 text-xs font-medium uppercase tracking-wide text-foreground md:flex">
            {(fields.nav || []).map((item, i) => (
              <a key={i} href={navHref(item)} className="transition-opacity hover:opacity-60">
                {item.label}
              </a>
            ))}
          </nav>

          <Link href={base} className="col-start-2 flex shrink-0 items-center gap-2 justify-self-center">
            {fields.logoUrl ? (
              <img src={fields.logoUrl} alt={storeName} className="h-6 w-6 rounded object-cover" />
            ) : (
              <Store className="h-4 w-4 text-foreground md:hidden" strokeWidth={1.5} />
            )}
            <span className="text-lg font-bold uppercase tracking-wide text-foreground">{storeName}</span>
          </Link>

          <div className="flex items-center justify-end gap-1 justify-self-end">
            <Button variant="ghost" size="icon" className="hidden h-8 w-8 rounded hover:bg-accent sm:inline-flex" data-testid="button-storefront-wishlist">
              <Heart className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            {fields.showSearch && (
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded hover:bg-accent" data-testid="button-storefront-search">
                <Search className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            )}
            {fields.showAccount && (
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded hover:bg-accent" data-testid="button-storefront-account">
                <User className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            )}
            {fields.showCart && (
              <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded hover:bg-accent" onClick={onOpenCart} data-testid="button-storefront-cart">
                <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[10px] font-medium text-background">
                    {cartCount}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
