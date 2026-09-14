import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Wallet, Clock } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface FinancialData {
  totalRevenue: string;
  totalCommissions: string;
  totalPayouts: string;
  pendingPayouts: string;
  merchantBreakdown: Array<{
    merchantId: string;
    merchantName: string;
    totalOrders: number;
    totalRevenue: string;
    commissionEarned: string;
    lastPayoutDate: Date | null;
  }>;
  recentPayouts: Array<{
    id: string;
    merchantId: string;
    merchantName: string;
    totalAmount: string;
    status: string;
    payoutTransactionId: string | null;
    scheduledFor: Date;
    completedAt: Date | null;
    createdAt: Date;
  }>;
}

export default function AdminFinancials() {
  const { data, isLoading } = useQuery<FinancialData>({
    queryKey: ["/api/admin/financials"],
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
    };
    return variants[status] || "outline";
  };

  // Prepare chart data - group by last 30 days
  const getChartData = () => {
    if (!data?.merchantBreakdown) return [];
    
    // For simplicity, show commission per merchant
    return data.merchantBreakdown
      .sort((a, b) => parseFloat(b.commissionEarned) - parseFloat(a.commissionEarned))
      .slice(0, 10)
      .map(item => ({
        name: item.merchantName.length > 20 
          ? item.merchantName.substring(0, 20) + '...' 
          : item.merchantName,
        commission: parseFloat(item.commissionEarned),
      }));
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold" data-testid="text-page-title">Financial Dashboard</h1>
        <p className="text-muted-foreground mt-2" data-testid="text-page-description">
          Platform revenue, commissions, and payout tracking
        </p>
      </div>

      {/* Revenue Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" data-testid="skeleton-total-revenue" />
            ) : (
              <div>
                <div className="text-2xl font-bold" data-testid="text-total-revenue">
                  {formatCurrency(data?.totalRevenue || '0')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  From all paid orders
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-total-commissions">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" data-testid="skeleton-total-commissions" />
            ) : (
              <div>
                <div className="text-2xl font-bold" data-testid="text-total-commissions">
                  {formatCurrency(data?.totalCommissions || '0')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  2% platform fee
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-total-payouts">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" data-testid="skeleton-total-payouts" />
            ) : (
              <div>
                <div className="text-2xl font-bold" data-testid="text-total-payouts">
                  {formatCurrency(data?.totalPayouts || '0')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed disbursements
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-pending-payouts">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" data-testid="skeleton-pending-payouts" />
            ) : (
              <div>
                <div className="text-2xl font-bold" data-testid="text-pending-payouts">
                  {formatCurrency(data?.pendingPayouts || '0')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Awaiting disbursement
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card data-testid="card-revenue-chart">
        <CardHeader>
          <CardTitle>Commission Revenue by Merchant (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" data-testid="skeleton-revenue-chart" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="commission" fill="hsl(var(--primary))" name="Commission Earned" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Commission Breakdown Table */}
      <Card data-testid="card-commission-breakdown">
        <CardHeader>
          <CardTitle>Merchant Commission Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-merchant">Merchant</TableHead>
                    <TableHead data-testid="header-total-orders">Total Orders</TableHead>
                    <TableHead data-testid="header-total-revenue">Total Revenue</TableHead>
                    <TableHead data-testid="header-commission">Commission Earned (2%)</TableHead>
                    <TableHead data-testid="header-last-payout">Last Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.merchantBreakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground" data-testid="text-no-data">
                        No merchant data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.merchantBreakdown.map((item) => (
                      <TableRow key={item.merchantId} data-testid={`row-merchant-${item.merchantId}`}>
                        <TableCell className="font-medium" data-testid={`text-merchant-name-${item.merchantId}`}>
                          {item.merchantName}
                        </TableCell>
                        <TableCell data-testid={`text-orders-${item.merchantId}`}>
                          {item.totalOrders}
                        </TableCell>
                        <TableCell data-testid={`text-revenue-${item.merchantId}`}>
                          {formatCurrency(item.totalRevenue)}
                        </TableCell>
                        <TableCell className="font-semibold" data-testid={`text-commission-${item.merchantId}`}>
                          {formatCurrency(item.commissionEarned)}
                        </TableCell>
                        <TableCell data-testid={`text-last-payout-${item.merchantId}`}>
                          {item.lastPayoutDate 
                            ? format(new Date(item.lastPayoutDate), 'MMM dd, yyyy')
                            : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payouts Table */}
      <Card data-testid="card-recent-payouts">
        <CardHeader>
          <CardTitle>Recent Payout Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-payout-merchant">Merchant</TableHead>
                    <TableHead data-testid="header-payout-amount">Amount</TableHead>
                    <TableHead data-testid="header-payout-status">Status</TableHead>
                    <TableHead data-testid="header-payout-transfer-id">Transfer ID</TableHead>
                    <TableHead data-testid="header-payout-date">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recentPayouts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground" data-testid="text-no-payouts">
                        No payout history available
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.recentPayouts.map((payout) => (
                      <TableRow key={payout.id} data-testid={`row-payout-${payout.id}`}>
                        <TableCell className="font-medium" data-testid={`text-payout-merchant-${payout.id}`}>
                          {payout.merchantName || 'Unknown'}
                        </TableCell>
                        <TableCell data-testid={`text-payout-amount-${payout.id}`}>
                          {formatCurrency(payout.totalAmount)}
                        </TableCell>
                        <TableCell data-testid={`badge-payout-status-${payout.id}`}>
                          <Badge variant={getStatusBadge(payout.status)}>
                            {payout.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm" data-testid={`text-transfer-id-${payout.id}`}>
                          {payout.payoutTransactionId || '-'}
                        </TableCell>
                        <TableCell data-testid={`text-payout-date-${payout.id}`}>
                          {payout.completedAt 
                            ? format(new Date(payout.completedAt), 'MMM dd, yyyy')
                            : format(new Date(payout.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
