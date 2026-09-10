import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, ShoppingCart, Star, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Analytics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [dateFilter, setDateFilter] = useState<string>("year");

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

  const { data: stats, isLoading } = useQuery<{
    totalRevenue: string;
    totalOrders: number;
    averageOrder: string;
    popularItemsCount: number;
    popularItems: Array<{ name: string; orders: number; revenue: string }>;
    dineInRevenue: string;
    takeoutRevenue: string;
    deliveryRevenue: string;
    onlineRevenue: string;
  }>({
    queryKey: ["/api/analytics/detailed", dateFilter],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/detailed?dateFilter=${dateFilter}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
  });

  if (authLoading || isLoading) {
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

  const metrics = [
    {
      title: "Total Revenue",
      value: stats?.totalRevenue ? `$${stats.totalRevenue}` : "$0",
      icon: DollarSign,
      change: "+15.3%",
      trend: "up",
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders || "0",
      icon: ShoppingCart,
      change: "+8.2%",
      trend: "up",
    },
    {
      title: "Average Order",
      value: stats?.averageOrder ? `$${stats.averageOrder}` : "$0",
      icon: TrendingUp,
      change: "+3.1%",
      trend: "up",
    },
    {
      title: "Popular Items",
      value: stats?.popularItemsCount || "0",
      icon: Star,
      change: "5 items",
      trend: "neutral",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your restaurant's performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-date-filter">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today" data-testid="filter-today">Today</SelectItem>
              <SelectItem value="yesterday" data-testid="filter-yesterday">Yesterday</SelectItem>
              <SelectItem value="last-7-days" data-testid="filter-last-7-days">Last 7 days</SelectItem>
              <SelectItem value="this-month" data-testid="filter-this-month">This month</SelectItem>
              <SelectItem value="last-month" data-testid="filter-last-month">Last month</SelectItem>
              <SelectItem value="year" data-testid="filter-year">Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`metric-${metric.title.toLowerCase().replace(/\s/g, '-')}`}>
                {metric.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {metric.trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
                {metric.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Popular Menu Items</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.popularItems && stats.popularItems.length > 0 ? (
              <div className="space-y-3">
                {stats.popularItems.slice(0, 5).map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.orders} orders</p>
                    </div>
                    <p className="text-lg font-bold text-primary">${item.revenue}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No data available yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <span>Dine-in</span>
              <span className="font-semibold">${stats?.dineInRevenue || "0"}</span>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <span>Takeout</span>
              <span className="font-semibold">${stats?.takeoutRevenue || "0"}</span>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <span>Delivery</span>
              <span className="font-semibold">${stats?.deliveryRevenue || "0"}</span>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <span>Online Orders</span>
              <span className="font-semibold">${stats?.onlineRevenue || "0"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
