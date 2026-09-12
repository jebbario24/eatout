import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Package, Users, BarChart3, Target, Award, UserX } from "lucide-react";
import type { MenuItem, Order, OrderItem, Bundle } from "@shared/schema";

export default function Reports() {
  const { t } = useTranslation();

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: allOrderItems = [], isLoading: itemsLoading } = useQuery<(OrderItem & { menuItem?: MenuItem; bundle?: Bundle })[]>({
    queryKey: ["/api/order-items"],
  });

  const { data: promoPerformance = [], isLoading: promoPerfLoading } = useQuery<
    Array<{ code: string | null; name: string; redemptions: number; revenue: string; discount: string }>
  >({
    queryKey: ["/api/promos/performance"],
  });

  const { data: loyaltyReportStats, isLoading: loyaltyStatsLoading } = useQuery<{
    totalMembers: number;
    activeMembers: number;
    tierDistribution: Array<{ tier: string; members: number }>;
  }>({
    queryKey: ["/api/loyalty/stats"],
  });

  const { data: reportCustomers = [], isLoading: customersLoading } = useQuery<
    Array<{ id: string; ordersCount: number; lastOrderAt: string | null }>
  >({
    queryKey: ["/api/customers"],
  });

  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered');
  
  const itemSales = allOrderItems.reduce((acc, item) => {
    const itemName = item.menuItem?.name || item.bundle?.name || 'Unknown Item';
    if (!acc[itemName]) {
      acc[itemName] = {
        name: itemName,
        quantity: 0,
        revenue: 0
      };
    }
    acc[itemName].quantity += item.quantity;
    acc[itemName].revenue += parseFloat(item.subtotal);
    return acc;
  }, {} as Record<string, { name: string; quantity: number; revenue: number }>);

  const topItems = Object.values(itemSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const totalRevenue = completedOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
  const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

  // Repeat rate: real customers with 2+ orders, over all customers who have ordered at least once.
  const orderedCustomers = reportCustomers.filter(c => c.ordersCount > 0);
  const repeatCustomerCount = orderedCustomers.filter(c => c.ordersCount >= 2).length;
  const repeatRate = orderedCustomers.length > 0
    ? `${Math.round((repeatCustomerCount / orderedCustomers.length) * 100)}%`
    : '0%';

  const loyaltyStats = {
    totalMembers: loyaltyReportStats?.totalMembers ?? 0,
    activeMembers: loyaltyReportStats?.activeMembers ?? 0,
    repeatRate,
  };

  const tierDistribution = (loyaltyReportStats?.tierDistribution ?? []).map(t => ({
    tier: t.tier,
    members: t.members,
    percentage: loyaltyStats.totalMembers > 0 ? Math.round((t.members / loyaltyStats.totalMembers) * 100) : 0,
  }));

  // Churn/retention: real, computed from days since each customer's last order.
  const now = Date.now();
  const daysSince = (iso: string | null) => (iso ? (now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24) : Infinity);
  const activeCustomers = orderedCustomers.filter(c => daysSince(c.lastOrderAt) <= 30).length;
  const atRiskCustomers = orderedCustomers.filter(c => { const d = daysSince(c.lastOrderAt); return d > 30 && d <= 60; }).length;
  const churnedCustomers = orderedCustomers.filter(c => daysSince(c.lastOrderAt) > 60).length;
  const churnMetrics = {
    totalCustomers: orderedCustomers.length,
    activeCustomers,
    atRiskCustomers,
    churnedCustomers,
    churnRate: orderedCustomers.length > 0 ? `${Math.round((churnedCustomers / orderedCustomers.length) * 100)}%` : '0%',
    retentionRate: orderedCustomers.length > 0 ? `${Math.round((activeCustomers / orderedCustomers.length) * 100)}%` : '0%',
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive insights into sales, promos, loyalty, and customer behavior
        </p>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList>
          <TabsTrigger value="sales" data-testid="tab-sales">Sales Reports</TabsTrigger>
          <TabsTrigger value="promos" data-testid="tab-promos">Promo Performance</TabsTrigger>
          <TabsTrigger value="loyalty" data-testid="tab-loyalty">Loyalty Reports</TabsTrigger>
          <TabsTrigger value="churn" data-testid="tab-churn">DR/Churn</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          {ordersLoading || itemsLoading ? (
            <div className="space-y-3">
              <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
              <Skeleton className="h-96 w-full" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-revenue">
                      ${totalRevenue.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      From {completedOrders.length} completed orders
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-avg-order-value">
                      ${avgOrderValue.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Per transaction
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-items-sold">
                      {allOrderItems.reduce((sum, item) => sum + item.quantity, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total units
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Items</CardTitle>
                  <CardDescription>Best performing menu items by revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  {topItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No sales data available yet</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead className="text-right">Quantity Sold</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topItems.map((item, index) => (
                          <TableRow key={item.name} data-testid={`sales-item-${index}`}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right font-medium">
                              ${item.revenue.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="promos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Promo Code Performance</CardTitle>
              <CardDescription>Redemptions, revenue impact, and ROI analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {promoPerfLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : promoPerformance.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No promo codes active yet</p>
                  <p className="text-sm mt-2">Create promos in the Marketing section</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Promo Code</TableHead>
                      <TableHead className="text-right">Redemptions</TableHead>
                      <TableHead className="text-right">Revenue Generated</TableHead>
                      <TableHead className="text-right">Discount Given</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promoPerformance.map((promo) => {
                      const revenue = parseFloat(promo.revenue) || 0;
                      const discount = parseFloat(promo.discount) || 0;
                      const roi = discount > 0 ? revenue / discount : null;
                      return (
                        <TableRow key={promo.code} data-testid={`promo-${promo.code}`}>
                          <TableCell className="font-medium">
                            <Badge variant="outline">{promo.code}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{promo.redemptions}</TableCell>
                          <TableCell className="text-right">${revenue.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-red-500">
                            -${discount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {roi !== null ? `${roi.toFixed(1)}x` : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-4">
          {loyaltyStatsLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
          <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-members">
                  {loyaltyStats.totalMembers}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {loyaltyStats.activeMembers} active this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Repeat Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-repeat-rate">
                  {loyaltyStats.repeatRate}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Customers ordering 2+ times
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Loyalty Tier Distribution</CardTitle>
              <CardDescription>Member breakdown by tier level</CardDescription>
            </CardHeader>
            <CardContent>
              {tierDistribution.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No loyalty program members yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tierDistribution.map((tier) => (
                    <div key={tier.tier} className="space-y-2" data-testid={`tier-${tier.tier}`}>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          <span className="font-medium">{tier.tier} Tier</span>
                        </div>
                        <span className="text-muted-foreground">
                          {tier.members} members ({tier.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${tier.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>

        <TabsContent value="churn" className="space-y-4">
          {customersLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
          <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-customers">
                  {churnMetrics.totalCustomers}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-retention-rate">
                  {churnMetrics.retentionRate}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {churnMetrics.activeCustomers} active customers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="text-churn-rate">
                  {churnMetrics.churnRate}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {churnMetrics.churnedCustomers} churned customers
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer Retention Analysis</CardTitle>
              <CardDescription>
                Track customer behavior and identify at-risk segments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Active Customers</p>
                    <p className="text-sm text-muted-foreground">Ordered in last 30 days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{churnMetrics.activeCustomers}</p>
                    <Badge variant="default" className="bg-green-500">Healthy</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">At-Risk Customers</p>
                    <p className="text-sm text-muted-foreground">No orders in 30-60 days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {churnMetrics.atRiskCustomers}
                    </p>
                    <Badge variant="secondary">Monitor</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Churned Customers</p>
                    <p className="text-sm text-muted-foreground">No orders in 60+ days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{churnMetrics.churnedCustomers}</p>
                    <Badge variant="destructive">At Risk</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
