import { Link } from "wouter";
import { Search, User, ShoppingBag, Store } from "lucide-react";
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
        <div className="bg-primary px-4 py-2 text-center text-[11px] font-medium tracking-[0.08em] text-primary-foreground">
          {fields.announcementText}
        </div>
      )}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-20 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <nav className="hidden items-center gap-6 text-[13px] text-foreground/80 md:flex">
            {(fields.nav || []).map((item, i) => (
              <a key={i} href={navHref(item)} className="transition-colors hover:text-primary">
                {item.label}
              </a>
            ))}
          </nav>

          <Link href={base} className="col-start-2 flex shrink-0 items-center gap-2 justify-self-center">
            {fields.logoUrl ? (
              <img src={fields.logoUrl} alt={storeName} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <Store className="h-5 w-5 text-primary md:hidden" strokeWidth={1.5} />
            )}
            <span className="font-serif text-2xl italic tracking-tight text-foreground">{storeName}</span>
          </Link>

          <div className="flex items-center justify-end gap-1 justify-self-end">
            {fields.showSearch && (
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-accent" data-testid="button-storefront-search">
                <Search className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            )}
            {fields.showAccount && (
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-accent" data-testid="button-storefront-account">
                <User className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            )}
            {fields.showCart && (
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-accent" onClick={onOpenCart} data-testid="button-storefront-cart">
                <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
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
