import { ReactNode } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Store } from "lucide-react";

export function useResolvedSlug() {
  const params = useParams();
  const paramSlug = (params as any).slug as string | undefined;
  const { data } = useQuery<{ slug: string } | null>({
    queryKey: ["/api/storefront/by-hostname"],
    enabled: !paramSlug,
    queryFn: async () => {
      const r = await fetch("/api/storefront/by-hostname");
      return r.ok ? r.json() : null;
    },
  });
  return paramSlug || data?.slug;
}

type NavItem = { id?: string; label: string; type: string; value?: string; external?: boolean };

/** Shared storefront chrome for CMS pages/blog: announcement bar, header with the
 *  merchant's configured nav, and a footer listing footer pages. */
export function StorefrontShell({
  slug,
  children,
  activeHandle,
}: {
  slug?: string;
  children: ReactNode;
  activeHandle?: string;
}) {
  const { data: restaurant } = useQuery<any>({
    queryKey: [`/api/storefront/${slug}`],
    enabled: !!slug,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}`);
      return r.ok ? r.json() : null;
    },
  });
  const { data: pages = [] } = useQuery<any[]>({
    queryKey: [`/api/storefront/${slug}/pages`],
    enabled: !!slug,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}/pages`);
      return r.ok ? r.json() : [];
    },
  });

  const base = slug ? `/store/${slug}` : "";
  const nav: NavItem[] = restaurant?.storefrontNav?.items || [];
  const announcement = restaurant?.announcement;
  const footerPages = pages.filter((p) => p.showInFooter);

  const hrefFor = (item: NavItem): string => {
    switch (item.type) {
      case "home": return base || "/";
      case "menu": return base || "/";
      case "collection": return `${base}/c/${item.value || ""}`;
      case "page": return `${base}/pages/${item.value || ""}`;
      case "blog": return `${base}/blog`;
      case "url": return item.value || "#";
      default: return "#";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {announcement?.enabled && announcement.text && (
        <div className="bg-primary text-primary-foreground text-center text-sm py-2 px-4" data-testid="announcement-bar">
          {announcement.text}
          {announcement.linkUrl && (
            <a href={announcement.linkUrl} className="ml-2 underline font-medium">
              {announcement.linkLabel || "Learn more"}
            </a>
          )}
        </div>
      )}

      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href={base || "/"} className="flex items-center gap-2">
            {restaurant?.logoUrl ? (
              <img src={restaurant.logoUrl} alt={restaurant.name} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <Store className="h-6 w-6 text-primary" />
            )}
            <span className="font-display text-lg font-bold">{restaurant?.name || "Store"}</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {nav.map((item, idx) => (
              <a
                key={item.id || idx}
                href={hrefFor(item)}
                target={item.type === "url" && item.external ? "_blank" : undefined}
                rel={item.type === "url" && item.external ? "noopener noreferrer" : undefined}
                className={`rounded-md px-2.5 py-1.5 hover:bg-accent ${
                  activeHandle && item.value === activeHandle ? "font-semibold text-primary" : "text-muted-foreground"
                }`}
                data-testid={`nav-link-${idx}`}
              >
                {item.label}
              </a>
            ))}
            <Link href={base || "/"}>
              <Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Store</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href={base || "/"} className="hover:text-foreground">{restaurant?.name || "Home"}</Link>
            {footerPages.map((p) => (
              <Link key={p.id} href={`${base}/pages/${p.handle}`} className="hover:text-foreground">{p.title}</Link>
            ))}
            <Link href={`${base}/blog`} className="hover:text-foreground">Blog</Link>
          </div>
          <p className="mt-4 text-xs">© {new Date().getFullYear()} {restaurant?.name}. Powered by EatOut.</p>
        </div>
      </footer>
    </div>
  );
}
