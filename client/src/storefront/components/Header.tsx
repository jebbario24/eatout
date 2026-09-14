import { Link } from "wouter";
import { Search, User, ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HeaderFields {
  logoUrl?: string | null;
  nav: Array<{ label: string; type: string; value?: string }>;
  showSearch: boolean;
  showAccount: boolean;
  showCart: boolean;
  // Optional top announcement strip — unused by the Farfetch theme (its Do's/
  // Don'ts call for zero decorative chrome above the nav), rendered by themes
  // like Adanola that specify one.
  announcementText?: string | null;
}

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
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <nav className="hidden items-center gap-6 text-[13px] font-normal text-foreground md:flex">
          {(fields.nav || []).map((item, i) => (
            <a
              key={i}
              href={navHref(item)}
              className="group relative py-1"
            >
              {item.label}
              <span className="absolute inset-x-0 -bottom-0.5 h-px scale-x-0 bg-foreground transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <Link href={base} className="col-start-2 flex shrink-0 items-center gap-2.5 justify-self-center">
          {fields.logoUrl ? (
            <img src={fields.logoUrl} alt={storeName} className="h-7 w-7 object-cover" />
          ) : (
            <Store className="h-5 w-5 text-foreground md:hidden" strokeWidth={1.5} />
          )}
          <span className="font-sans text-lg font-bold uppercase tracking-[0.12em] text-foreground">{storeName}</span>
        </Link>

        <div className="flex items-center justify-end gap-1 justify-self-end">
          {fields.showSearch && (
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none hover:bg-accent" data-testid="button-storefront-search">
              <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </Button>
          )}
          {fields.showAccount && (
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none hover:bg-accent" data-testid="button-storefront-account">
              <User className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </Button>
          )}
          {fields.showCart && (
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-none hover:bg-accent" onClick={onOpenCart} data-testid="button-storefront-cart">
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} />
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
  );
}
