import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DineInOnlyGuard } from "@/components/DineInOnlyGuard";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { RestaurantSetupGuard } from "@/components/RestaurantSetupGuard";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/UserMenu";
import { usePlatformLanguage } from "@/hooks/useLanguage";
import "./i18n";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Menu from "@/pages/Menu";
import Orders from "@/pages/Orders";
import Reservations from "@/pages/Reservations";
import Tables from "@/pages/Tables";
import Staff from "@/pages/Staff";
import Inventory from "@/pages/Inventory";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import POS from "@/pages/POS";
import Storefront from "@/pages/Storefront";
import Subscribe from "@/pages/Subscribe";
import DeliveryZones from "@/pages/DeliveryZones";
import OnlineStore from "@/pages/OnlineStore";
import Billing from "@/pages/Billing";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminOrders from "@/pages/AdminOrders";
import AdminRestaurants from "@/pages/AdminRestaurants";
import AdminSubscriptions from "@/pages/AdminSubscriptions";
import AdminSettings from "@/pages/AdminSettings";
import AdminFinancials from "@/pages/AdminFinancials";
import AdminUsers from "@/pages/AdminUsers";
import AdminPayouts from "@/pages/AdminPayouts";
import AdminModeration from "@/pages/AdminModeration";
import AdminActivityLogs from "@/pages/AdminActivityLogs";
import NotFound from "@/pages/not-found";
import Marketing from "@/pages/marketing/Marketing";
import Promos from "@/pages/marketing/Promos";
import Boosts from "@/pages/marketing/Boosts";
import Upsells from "@/pages/marketing/Upsells";
import Messages from "@/pages/marketing/Messages";
import Social from "@/pages/marketing/Social";
import Bundles from "@/pages/marketing/Bundles";
import Pixels from "@/pages/marketing/Pixels";
import DomainVerification from "@/pages/marketing/DomainVerification";
import Drivers from "@/pages/Drivers";
import Reports from "@/pages/Reports";
import Inbox from "@/pages/Inbox";
import Payouts from "@/pages/Payouts";
import DeliveryLink from "@/pages/DeliveryLink";
import Contact from "@/pages/Contact";

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/contact" component={() => <Contact userType="merchant" />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedRouter() {
  const { user } = useAuth();
  
  // Admin routes
  if (user?.role === 'admin') {
    return (
      <Switch>
        <Route path="/" component={AdminDashboard} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/restaurants" component={AdminRestaurants} />
        <Route path="/admin/subscriptions" component={AdminSubscriptions} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/financials" component={AdminFinancials} />
        <Route path="/admin/payouts" component={AdminPayouts} />
        <Route path="/admin/moderation" component={AdminModeration} />
        <Route path="/admin/activity-logs" component={AdminActivityLogs} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Restaurant owner routes
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/billing" component={Billing} />
      <Route path="/menu" component={Menu} />
      <Route path="/orders" component={Orders} />
      <Route path="/reservations">
        <DineInOnlyGuard><Reservations /></DineInOnlyGuard>
      </Route>
      <Route path="/tables">
        <DineInOnlyGuard><Tables /></DineInOnlyGuard>
      </Route>
      <Route path="/staff" component={Staff} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/delivery-zones" component={DeliveryZones} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/online-store" component={OnlineStore} />
      <Route path="/settings" component={Settings} />
      <Route path="/pos" component={POS} />
      <Route path="/marketing" component={Marketing} />
      <Route path="/marketing/promos" component={Promos} />
      <Route path="/marketing/boosts" component={Boosts} />
      <Route path="/marketing/upsells" component={Upsells} />
      <Route path="/marketing/messages" component={Messages} />
      <Route path="/marketing/social" component={Social} />
      <Route path="/marketing/bundles" component={Bundles} />
      <Route path="/marketing/pixels" component={Pixels} />
      <Route path="/marketing/domain-verification" component={DomainVerification} />
      <Route path="/drivers" component={Drivers} />
      <Route path="/reports" component={Reports} />
      <Route path="/inbox" component={Inbox} />
      <Route path="/payouts" component={Payouts} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  usePlatformLanguage();
  
  // Track RTL direction dynamically
  const [isRTL, setIsRTL] = useState(document.documentElement.dir === 'rtl');
  
  useEffect(() => {
    // Watch for direction changes
    const observer = new MutationObserver(() => {
      setIsRTL(document.documentElement.dir === 'rtl');
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir']
    });
    
    return () => observer.disconnect();
  }, []);
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PublicRouter />;
  }

  // Restaurant owner and admin layout
  return (
    <SubscriptionGuard>
      <RestaurantSetupGuard>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar side={isRTL ? "right" : "left"} />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between p-3 border-b">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex items-center gap-2">
                  <UserMenu />
                </div>
              </header>
              <main className="flex-1 overflow-auto">
                <AuthenticatedRouter />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </RestaurantSetupGuard>
    </SubscriptionGuard>
  );
}

function StorefrontRouter() {
  return (
    <Switch>
      <Route path="/" component={Storefront} />
      <Route path="/store/:slug" component={Storefront} />
      <Route component={Storefront} />
    </Switch>
  );
}

function App() {
  const currentPath = window.location.pathname;
  const isStorefrontPath = currentPath.startsWith('/store/');
  const isDeliveryLinkPath = currentPath.startsWith('/deliver/');

  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  const isReplitDomain = hostname.includes('replit.app') || hostname.includes('replit.dev');
  const isStorefrontDomain = isReplitDomain && (
    (hostname.includes('replit.app') && parts.length > 3) ||
    (hostname.includes('replit.dev') && parts.length > 4)
  );

  // Drivers have no account — their delivery link works with no auth gate at all,
  // the same way the public storefront does.
  if (isDeliveryLinkPath) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Switch>
            <Route path="/deliver/:token" component={DeliveryLink} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (isStorefrontPath || isStorefrontDomain) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <StorefrontRouter />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
