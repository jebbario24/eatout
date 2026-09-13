import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  BarChart3,
  Settings,
  Palette,
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
  Globe
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
import type { Restaurant } from "@shared/schema";
import { getBusinessTypeConfig } from "@/lib/businessType";

// Core sections
const coreItems = [
  {
    titleKey: "navigation.dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    titleKey: "navigation.orders",
    url: "/orders",
    icon: ShoppingCart,
  },
];

// Marketing section
const marketingItems = [
  {
    titleKey: "navigation.marketing",
    url: "/marketing",
    icon: Megaphone,
  },
  {
    titleKey: "navigation.campaigns",
    url: "/marketing/campaigns",
    icon: Send,
  },
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
];

const baseOperationsItems = [
  {
    titleKey: "navigation.staff",
    url: "/staff",
    icon: Users,
  },
];

// Reports & Payments section
const reportsItems = [
  {
    titleKey: "navigation.analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    titleKey: "navigation.growth",
    url: "/growth",
    icon: TrendingUp,
  },
  {
    titleKey: "navigation.reports",
    url: "/reports",
    icon: FileText,
  },
  {
    titleKey: "navigation.payouts",
    url: "/payouts",
    icon: DollarSign,
  },
];

// Customer section
const customerItems = [
  {
    titleKey: "navigation.customers",
    url: "/customers",
    icon: UserRound,
  },
  {
    titleKey: "navigation.inbox",
    url: "/inbox",
    icon: MessageSquare,
  },
];

// Store section
const storeItems = [
  {
    titleKey: "navigation.onlineStore",
    url: "/online-store",
    icon: Palette,
  },
  {
    titleKey: "navigation.pagesBlog",
    url: "/online-store/content",
    icon: FileText,
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
  {
    titleKey: "navigation.markets",
    url: "/markets",
    icon: Globe,
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
    titleKey: "navigation.allRestaurants",
    url: "/admin/restaurants",
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
  const operationsItems = baseOperationsItems;
  return [
    ...coreItems,
    ...catalogItems,
    ...marketingItems,
    ...operationsItems,
    ...reportsItems,
    ...customerItems,
    ...storeItems,
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

  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ['/api/restaurants/me'],
    enabled: user?.role === 'owner',
  });
  const businessConfig = getBusinessTypeConfig(restaurant?.businessType);
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
    {
      titleKey: "navigation.inventory",
      url: "/inventory",
      icon: Package,
    },
  ];

  const operationsItems = baseOperationsItems;

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
            {renderMenuGroup(menuItems, t('navigation.catalogSection', { catalog: catalogLabel }))}
            {renderMenuGroup(marketingItems, t('navigation.marketing'))}
            {renderMenuGroup(operationsItems, t('navigation.operations'))}
            {renderMenuGroup(reportsItems, t('navigation.reportsFinance'))}
            {renderMenuGroup(customerItems, t('navigation.customer'))}
            {renderMenuGroup(storeItems, t('navigation.onlineStore'))}
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
