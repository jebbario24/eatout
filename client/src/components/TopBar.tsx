import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Restaurant } from "@shared/schema";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/hooks/useAuth";
import { useNewOrders } from "@/hooks/useNewOrders";
import { useTranslation } from "react-i18next";
import { getBusinessTypeConfig } from "@/lib/businessType";
import { getSearchableRoutes, adminMenuItems } from "@/components/app-sidebar";
import { Bell, Search, Store } from "lucide-react";

export function TopBar() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { newOrdersCount } = useNewOrders();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const homeUrl = isAdmin ? "/admin" : "/dashboard";

  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/restaurants/me"],
    enabled: user?.role === "owner",
  });
  const businessConfig = getBusinessTypeConfig(restaurant?.businessType);

  const routes = useMemo(
    () => (isAdmin ? adminMenuItems : getSearchableRoutes(businessConfig)),
    [isAdmin, businessConfig]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const goTo = (url: string) => {
    setLocation(url);
    setOpen(false);
  };

  return (
    <header className="h-14 shrink-0 flex items-center justify-between gap-4 bg-black text-white px-4 border-b border-black/20">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <SidebarTrigger className="text-white hover:bg-white/10" data-testid="button-sidebar-toggle" />
        <Link href={homeUrl} className="flex items-center gap-2 shrink-0">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
            <Store className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-display font-bold hidden sm:inline">EatOut</span>
        </Link>
      </div>

      <div className="flex-1 flex justify-center max-w-md">
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="w-full max-w-sm justify-between bg-white/10 border-white/20 text-white/70 hover:bg-white/20 hover:text-white"
          data-testid="button-open-command-palette"
        >
          <span className="flex items-center gap-2 text-sm">
            <Search className="h-4 w-4" />
            Search
          </span>
          <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-white/30 bg-white/10 px-1.5 font-mono text-[10px] text-white/70">
            Ctrl K
          </kbd>
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-1 justify-end">
        <Link href="/orders">
          <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10" data-testid="button-notifications">
            <Bell className="h-5 w-5" />
            {newOrdersCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full"
                data-testid="badge-notification-count"
              >
                {newOrdersCount}
              </Badge>
            )}
          </Button>
        </Link>
        <UserMenu />
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Jump to a page..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {routes.map((r) => (
              <CommandItem key={r.url} onSelect={() => goTo(r.url)} data-testid={`command-item-${r.url}`}>
                <r.icon className="h-4 w-4" />
                <span>{r.titleKey === "navigation.menu" ? businessConfig.catalog : t(r.titleKey)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
