import {
  Home,
  ShoppingCart,
  Users,
  Package,
  BarChart3,
  Settings,
  CreditCard,
  Building2,
  Megaphone,
  FileText,
  MessageSquare,
  DollarSign,
  Shield,
  Activity,
  Heart,
  UserRound,
  Gift,
  Layers,
  Send,
  TrendingUp,
  Globe,
  Store,
  Tag,
  LayoutDashboard
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useNewOrders } from "@/hooks/useNewOrders";
import { useQuery } from "@tanstack/react-query";
import type { Merchant } from "@shared/schema";
import { getBusinessTypeConfig } from "@/lib/businessType";

// Top-level, ungrouped — mirrors Shopify's own Home/Orders rows
const coreItems = [
  {
    titleKey: "navigation.home",
    url: "/dashboard",
    icon: Home,
  },
  {
    titleKey: "navigation.orders",
    url: "/orders",
    icon: ShoppingCart,
  },
];

// Growth section — folds in Shopify's separate "Discounts" row alongside our
// existing marketing tools. Loyalty & Rewards and Gift Cards aren't listed
// here directly — they're one click away via the Marketing hub's own tiles,
// so dropping their sidebar rows loses no reachability, just clutter.
const marketingItems = [
  {
    titleKey: "navigation.growth",
    url: "/growth",
    icon: TrendingUp,
  },
  {
    titleKey: "navigation.discounts",
    url: "/marketing/promos",
    icon: Tag,
  },
  {
    titleKey: "navigation.marketing",
    url: "/marketing",
    icon: Megaphone,
  },
];

// Loyalty & Rewards, Gift Cards, and Campaigns stay searchable even though
// they no longer have their own sidebar row (see marketingItems comment
// above) — all three are one click away via the Marketing hub's own tiles.
const marketingHubOnlyItems = [
  {
    titleKey: "navigation.loyaltyRewards",
    url: "/marketing/loyalty",
    icon: Heart,
  },
  {
    titleKey: "navigation.giftCards",
    url: "/marketing/gift-cards",
    icon: Gift,
  },
  {
    titleKey: "navigation.campaigns",
    url: "/marketing/campaigns",
    icon: Send,
  },
];

// Staff no longer gets its own top-level "Operations" section — a lone team
// list isn't an e-commerce sidebar concern, so it now lives as a "Team" tab
// inside Settings (see Settings.tsx), matching Shopify's Settings > Users
// and permissions. Kept here only so the command palette can still find it.
const staffItem = {
  titleKey: "navigation.staff",
  url: "/staff",
  icon: Users,
};

// Content section — Shopify's Content covers pages; ours are the storefront's
const contentItems = [
  {
    titleKey: "navigation.storefrontPages",
    url: "/online-store/pages",
    icon: FileText,
  },
];

// Markets section
const marketsItems = [
  {
    titleKey: "navigation.markets",
    url: "/markets",
    icon: Globe,
  },
];

// Finance section
const financeItems = [
  {
    titleKey: "navigation.payouts",
    url: "/payouts",
    icon: DollarSign,
  },
];

// Analytics section — Reports lives inside the Analytics page (a "View
// detailed reports" link there) rather than as its own sidebar row, since
// the two pages otherwise looked like duplicate entries.
const reportsItems = [
  {
    titleKey: "navigation.analytics",
    url: "/analytics",
    icon: BarChart3,
  },
];

const reportsHubOnlyItems = [
  {
    titleKey: "navigation.reports",
    url: "/reports",
    icon: FileText,
  },
];

// Customers section — Inbox & Reviews is one click away from the Customers
// page itself rather than its own sidebar row.
const customerItems = [
  {
    titleKey: "navigation.customers",
    url: "/customers",
    icon: UserRound,
  },
];

const customersHubOnlyItems = [
  {
    titleKey: "navigation.inbox",
    url: "/inbox",
    icon: MessageSquare,
  },
];

// Sales channels section — our single channel is the online store itself
const storeItems = [
  {
    titleKey: "navigation.storeBuilder",
    url: "/online-store",
    icon: Store,
  },
  {
    titleKey: "navigation.pixelsTracking",
    url: "/marketing/pixels",
    icon: BarChart3,
  },
  {
    titleKey: "navigation.domainVerification",
    url: "/marketing/domain-verification",
    icon: Shield,
  },
];

export const adminMenuItems = [
  {
    titleKey: "navigation.dashboard",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    titleKey: "navigation.allOrders",
    url: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    titleKey: "navigation.allMerchants",
    url: "/admin/merchants",
    icon: Building2,
  },
  {
    titleKey: "navigation.userManagement",
    url: "/admin/users",
    icon: Users,
  },
  {
    titleKey: "navigation.subscriptions",
    url: "/admin/subscriptions",
    icon: CreditCard,
  },
  {
    titleKey: "navigation.financials",
    url: "/admin/financials",
    icon: DollarSign,
  },
  {
    titleKey: "navigation.payoutManagement",
    url: "/admin/payouts",
    icon: CreditCard,
  },
  {
    titleKey: "navigation.contentModeration",
    url: "/admin/moderation",
    icon: Shield,
  },
  {
    titleKey: "navigation.activityLogs",
    url: "/admin/activity-logs",
    icon: Activity,
  },
  {
    titleKey: "navigation.platformSettings",
    url: "/admin/settings",
    icon: Settings,
  },
];

// Flattens the sidebar's own nav sections into one list for the top bar's command
// palette, so the two never drift apart the way two hand-maintained lists would.
export function getSearchableRoutes(businessConfig: ReturnType<typeof getBusinessTypeConfig>) {
  const catalogItems = [
    { titleKey: "navigation.menu", url: "/menu", icon: businessConfig.icon },
    { titleKey: "navigation.collections", url: "/collections", icon: Layers },
    { titleKey: "navigation.inventory", url: "/inventory", icon: Package },
  ];
  return [
    ...coreItems,
    ...catalogItems,
    ...customerItems,
    ...customersHubOnlyItems,
    ...marketingItems,
    ...marketingHubOnlyItems,
    ...contentItems,
    ...marketsItems,
    ...financeItems,
    ...reportsItems,
    ...reportsHubOnlyItems,
    ...storeItems,
    staffItem,
    { titleKey: "navigation.billing", url: "/billing", icon: CreditCard },
    { titleKey: "navigation.settings", url: "/settings", icon: Settings },
  ];
}

export function AppSidebar({ side }: { side?: "left" | "right" }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { newOrdersCount } = useNewOrders();
  
  const isAdmin = user?.role === 'admin';

  const { data: merchant } = useQuery<Merchant | null>({
    queryKey: ['/api/merchants/me'],
    enabled: user?.role === 'owner',
  });
  const businessConfig = getBusinessTypeConfig(merchant?.businessType);
  const catalogLabel = businessConfig.catalog;

  const menuItems = [
    {
      titleKey: "navigation.menu",
      url: "/menu",
      icon: businessConfig.icon,
    },
    {
      titleKey: "navigation.collections",
      url: "/collections",
      icon: Layers,
    },
  ];

  const renderMenuGroup = (items: typeof coreItems, label?: string) => (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={location === item.url || location.startsWith(item.url + '/')}
                data-testid={`link-${item.titleKey.includes('.') ? item.titleKey.split('.').pop() : item.titleKey.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Link href={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.titleKey === 'navigation.menu' ? catalogLabel : t(item.titleKey)}</span>
                  {item.url === '/orders' && newOrdersCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-auto h-5 w-5 flex items-center justify-center p-0 rounded-full text-xs"
                      data-testid="badge-new-orders"
                    >
                      {newOrdersCount}
                    </Badge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar side={side}>
      <SidebarContent>
        {isAdmin ? (
          renderMenuGroup(adminMenuItems, t('navigation.platformManagement'))
        ) : (
          <>
            {renderMenuGroup(coreItems)}
            {renderMenuGroup(menuItems, t('navigation.products'))}
            {renderMenuGroup(customerItems, t('navigation.customers'))}
            {renderMenuGroup(marketingItems, t('navigation.growthMarketing'))}
            {renderMenuGroup(contentItems, t('navigation.content'))}
            {renderMenuGroup(marketsItems, t('navigation.markets'))}
            {renderMenuGroup(financeItems, t('navigation.finance'))}
            {renderMenuGroup(reportsItems, t('navigation.analytics'))}
            {renderMenuGroup(storeItems, t('navigation.salesChannels'))}
          </>
        )}

        {!isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('navigation.account')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === "/billing"}
                    data-testid="link-billing"
                  >
                    <Link href="/billing">
                      <CreditCard className="h-4 w-4" />
                      <span>{t('navigation.billing')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === "/settings"}
                    data-testid="link-settings"
                  >
                    <Link href="/settings">
                      <Settings className="h-4 w-4" />
                      <span>{t('navigation.settings')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
