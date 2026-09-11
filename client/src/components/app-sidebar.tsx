import {
  LayoutDashboard,
  ShoppingCart,
  CalendarCheck, 
  Users, 
  Package, 
  BarChart3,
  Settings,
  Store,
  ChefHat,
  MapPin,
  Palette,
  CreditCard,
  Building2,
  Megaphone,
  Truck,
  FileText,
  MessageSquare,
  DollarSign,
  Shield,
  Activity,
  Heart,
  UserRound,
  Gift
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
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    titleKey: "Marketing",
    url: "/marketing",
    icon: Megaphone,
  },
  {
    titleKey: "Loyalty & Rewards",
    url: "/marketing/loyalty",
    icon: Heart,
  },
  {
    titleKey: "Gift Cards",
    url: "/marketing/gift-cards",
    icon: Gift,
  },
];

// Operations section — dine-in items (Reservations, Tables) are prepended
// only for restaurants; other verticals don't seat customers.
const dineInOperationsItems = [
  {
    titleKey: "navigation.reservations",
    url: "/reservations",
    icon: CalendarCheck,
  },
  {
    titleKey: "navigation.tables",
    url: "/tables",
    icon: ChefHat,
  },
];

const baseOperationsItems = [
  {
    titleKey: "navigation.staff",
    url: "/staff",
    icon: Users,
  },
  {
    titleKey: "Drivers",
    url: "/drivers",
    icon: Truck,
  },
  {
    titleKey: "navigation.deliveryZones",
    url: "/delivery-zones",
    icon: MapPin,
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
    titleKey: "Reports",
    url: "/reports",
    icon: FileText,
  },
  {
    titleKey: "Payouts",
    url: "/payouts",
    icon: DollarSign,
  },
];

// Customer section
const customerItems = [
  {
    titleKey: "Customers",
    url: "/customers",
    icon: UserRound,
  },
  {
    titleKey: "Inbox",
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
    titleKey: "Pixels & Tracking",
    url: "/marketing/pixels",
    icon: BarChart3,
  },
  {
    titleKey: "Domain Verification",
    url: "/marketing/domain-verification",
    icon: Shield,
  },
];

const adminMenuItems = [
  {
    titleKey: "navigation.dashboard",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    titleKey: "All Orders",
    url: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    titleKey: "navigation.allRestaurants",
    url: "/admin/restaurants",
    icon: Building2,
  },
  {
    titleKey: "User Management",
    url: "/admin/users",
    icon: Users,
  },
  {
    titleKey: "Subscriptions",
    url: "/admin/subscriptions",
    icon: CreditCard,
  },
  {
    titleKey: "Financials",
    url: "/admin/financials",
    icon: DollarSign,
  },
  {
    titleKey: "Payout Management",
    url: "/admin/payouts",
    icon: CreditCard,
  },
  {
    titleKey: "Content Moderation",
    url: "/admin/moderation",
    icon: Shield,
  },
  {
    titleKey: "Activity Logs",
    url: "/admin/activity-logs",
    icon: Activity,
  },
  {
    titleKey: "Platform Settings",
    url: "/admin/settings",
    icon: Settings,
  },
];

export function AppSidebar({ side }: { side?: "left" | "right" }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { newOrdersCount } = useNewOrders();
  
  const isAdmin = user?.role === 'admin';
  const homeUrl = isAdmin ? "/admin" : "/dashboard";

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
      titleKey: "navigation.inventory",
      url: "/inventory",
      icon: Package,
    },
  ];

  // Dine-in tables/reservations only apply to restaurants — other verticals
  // (grocery, pharmacy, flowers, retail) skip straight to fulfillment ops.
  const operationsItems = businessConfig.hasDineIn
    ? [...dineInOperationsItems, ...baseOperationsItems]
    : baseOperationsItems;

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
                  <span>{item.titleKey === 'navigation.menu' ? catalogLabel : (item.titleKey.includes('.') ? t(item.titleKey) : item.titleKey)}</span>
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
      <SidebarHeader className="border-b p-4">
        <Link href={homeUrl}>
          <div className="flex items-center gap-2 cursor-pointer hover-elevate p-2 rounded-md">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">EatOut</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        {isAdmin ? (
          renderMenuGroup(adminMenuItems, t('navigation.platformManagement'))
        ) : (
          <>
            {renderMenuGroup(coreItems)}
            {renderMenuGroup(menuItems, `${catalogLabel} & Catalog`)}
            {renderMenuGroup(marketingItems, "Marketing")}
            {renderMenuGroup(operationsItems, "Operations")}
            {renderMenuGroup(reportsItems, "Reports & Finance")}
            {renderMenuGroup(customerItems, "Customer")}
            {renderMenuGroup(storeItems, "Online Store")}
          </>
        )}

        {!isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
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

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.firstName || user?.email || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email || ""}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
