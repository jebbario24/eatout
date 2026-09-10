import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { Restaurant, Order } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Users,
  AlertCircle,
  Clock,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { RestaurantPWAPrompt } from "@/components/RestaurantPWAPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { RestaurantNotificationHeader } from "@/components/RestaurantNotificationHeader";
import { getBusinessTypeConfig } from "@/lib/businessType";

interface DashboardStats {
  todayRevenue: string;
  todayOrders: number;
  pendingOrders: number;
  averageOrder: string;
  activeStaff: number;
  totalStaff: number;
}

interface SubscriptionStatus {
  hasAccess: boolean;
  status: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  isTrialActive: boolean;
  isSubscriptionActive: boolean;
  manualAccessGranted?: boolean;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants/me"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/analytics/stats"],
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders/recent"],
  });

  const { data: subscriptionStatus } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription-status'],
  });

  const trialDaysLeft = subscriptionStatus?.trialEndsAt 
    ? Math.ceil((new Date(subscriptionStatus.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  if (authLoading || restaurantLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Welcome to EatOut!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Set up your business to start managing orders, your catalog, and more.
            </p>
            <Link href="/settings">
              <Button className="w-full" data-testid="button-setup-restaurant">
                Set Up Your Business
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const businessConfig = getBusinessTypeConfig(restaurant.businessType);

  const statCards = [
    {
      title: "Today's Revenue",
      value: stats?.todayRevenue ? `$${stats.todayRevenue}` : "$0",
      icon: DollarSign,
      description: "+12% from yesterday",
    },
    {
      title: "Orders Today",
      value: stats?.todayOrders || "0",
      icon: ShoppingCart,
      description: `${stats?.pendingOrders || 0} pending`,
    },
    {
      title: "Average Order",
      value: stats?.averageOrder ? `$${stats.averageOrder}` : "$0",
      icon: TrendingUp,
      description: "+5% from last week",
    },
    {
      title: "Active Staff",
      value: stats?.activeStaff || "0",
      icon: Users,
      description: `${stats?.totalStaff || 0} total`,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* PWA Features */}
      <OfflineIndicator />
      
      <RestaurantPWAPrompt />

      {/* Subscription Status Banner */}
      {subscriptionStatus?.isTrialActive && trialDaysLeft <= 3 && (
        <Alert className="border-primary">
          <Clock className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Your trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}. Subscribe to continue using EatOut.
            </span>
            <Link href="/subscribe">
              <Button size="sm" variant="default" data-testid="button-subscribe-trial">
                <CreditCard className="mr-2 h-4 w-4" />
                Subscribe Now
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {!subscriptionStatus?.hasAccess && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Your trial has expired. Subscribe to continue using EatOut.
            </span>
            <Link href="/subscribe">
              <Button size="sm" variant="destructive" data-testid="button-subscribe-expired">
                Subscribe Now - $79/month
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {restaurant.name}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                {statsLoading ? <Skeleton className="h-8 w-20" /> : stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                    data-testid={`order-${order.id}`}
                  >
                    <div>
                      <p className="font-medium">Order #{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.orderType} • {order.customerName || "Guest"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${order.total}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {order.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No orders yet
              </p>
            )}
            <Link href="/orders">
              <Button variant="outline" className="w-full mt-4" data-testid="button-view-all-orders">
                View All Orders
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/pos">
              <Button className="w-full justify-start" data-testid="button-new-order">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Create New Order
              </Button>
            </Link>
            {businessConfig.hasDineIn && (
              <Link href="/reservations">
                <Button variant="outline" className="w-full justify-start" data-testid="button-new-reservation">
                  New Reservation
                </Button>
              </Link>
            )}
            <Link href="/menu">
              <Button variant="outline" className="w-full justify-start" data-testid="button-manage-menu">
                Manage {businessConfig.catalog}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
