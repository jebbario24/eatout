import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/TopBar";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { RestaurantSetupGuard } from "@/components/RestaurantSetupGuard";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformLanguage } from "@/hooks/useLanguage";
import "./i18n";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Menu from "@/pages/Menu";
import Orders from "@/pages/Orders";
import Staff from "@/pages/Staff";
import Inventory from "@/pages/Inventory";
import Analytics from "@/pages/Analytics";
import Growth from "@/pages/Growth";
import Markets from "@/pages/Markets";
import Settings from "@/pages/Settings";
import POS from "@/pages/POS";
import Subscribe from "@/pages/Subscribe";
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
import Loyalty from "@/pages/marketing/Loyalty";
import GiftCards from "@/pages/marketing/GiftCards";
import Campaigns from "@/pages/marketing/Campaigns";
import Collections from "@/pages/Collections";
import Customers from "@/pages/Customers";
import Boosts from "@/pages/marketing/Boosts";
import Upsells from "@/pages/marketing/Upsells";
import Messages from "@/pages/marketing/Messages";
import Social from "@/pages/marketing/Social";
import Bundles from "@/pages/marketing/Bundles";
import Pixels from "@/pages/marketing/Pixels";
import DomainVerification from "@/pages/marketing/DomainVerification";
import Reports from "@/pages/Reports";
import Inbox from "@/pages/Inbox";
import Payouts from "@/pages/Payouts";
import Contact from "@/pages/Contact";
import Pricing from "@/pages/Pricing";
import Documentation from "@/pages/Documentation";
import About from "@/pages/About";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import { StorefrontRouter } from "@/storefront/StorefrontRouter";
import StoreBuilderWizard from "@/pages/OnlineStore/StoreBuilderWizard";
import StoreEditor from "@/pages/OnlineStore/StoreEditor";
import StoreOptimize from "@/pages/OnlineStore/StoreOptimize";
import StorefrontPages from "@/pages/StorefrontPages";

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/contact" component={Contact} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/docs" component={Documentation} />
      <Route path="/about" component={About} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
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
      <Route path="/collections" component={Collections} />
      <Route path="/orders" component={Orders} />
      <Route path="/staff" component={Staff} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/growth" component={Growth} />
      <Route path="/markets" component={Markets} />
      <Route path="/online-store" component={StoreBuilderWizard} />
      <Route path="/online-store/editor" component={StoreEditor} />
      <Route path="/online-store/optimize" component={StoreOptimize} />
      <Route path="/online-store/pages" component={StorefrontPages} />
      <Route path="/settings" component={Settings} />
      <Route path="/pos" component={POS} />
      <Route path="/marketing" component={Marketing} />
      <Route path="/marketing/promos" component={Promos} />
      <Route path="/marketing/campaigns" component={Campaigns} />
      <Route path="/marketing/loyalty" component={Loyalty} />
      <Route path="/marketing/gift-cards" component={GiftCards} />
      <Route path="/customers" component={Customers} />
      <Route path="/marketing/boosts" component={Boosts} />
      <Route path="/marketing/upsells" component={Upsells} />
      <Route path="/marketing/messages" component={Messages} />
      <Route path="/marketing/social" component={Social} />
      <Route path="/marketing/bundles" component={Bundles} />
      <Route path="/marketing/pixels" component={Pixels} />
      <Route path="/marketing/domain-verification" component={DomainVerification} />
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
          <div className="flex flex-col h-screen w-full">
            <TopBar />
            <div className="flex flex-1 overflow-hidden">
              <AppSidebar side={isRTL ? "right" : "left"} />
              <div className="flex flex-col flex-1 overflow-hidden">
                <main className="flex-1 overflow-auto">
                  <AuthenticatedRouter />
                </main>
              </div>
            </div>
          </div>
        </SidebarProvider>
      </RestaurantSetupGuard>
    </SubscriptionGuard>
  );
}

const isStorefrontPath = typeof window !== "undefined" && window.location.pathname.startsWith("/store/");

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isStorefrontPath ? <StorefrontRouter /> : <AppContent />}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
