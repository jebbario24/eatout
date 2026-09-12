import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SessionsResponse {
  byChannel: Array<{ channel: string; sessions: number }>;
  overTime: Array<{ date: string; sessions: number }>;
}

interface SalesByChannelRow {
  channel: string;
  orders: number;
  revenue: string;
}

const CHANNEL_LABELS: Record<string, string> = {
  direct: "Direct",
  organic: "Organic search",
  paid: "Paid",
  social: "Social",
  referral: "Referral",
  unknown: "Unknown",
  unattributed: "Unattributed",
};

export default function Growth() {
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

  const { data: sessions, isLoading: sessionsLoading } = useQuery<SessionsResponse>({
    queryKey: ["/api/growth/sessions", dateFilter],
    queryFn: async () => {
      const res = await fetch(`/api/growth/sessions?dateFilter=${dateFilter}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const { data: salesByChannel, isLoading: salesLoading } = useQuery<SalesByChannelRow[]>({
    queryKey: ["/api/growth/sales-by-channel", dateFilter],
    queryFn: async () => {
      const res = await fetch(`/api/growth/sales-by-channel?dateFilter=${dateFilter}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const totalSessions = sessions?.byChannel.reduce((sum, c) => sum + c.sessions, 0) ?? 0;

  if (authLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Growth</h1>
          <p className="text-muted-foreground mt-1">
            See where your storefront traffic comes from
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

      <Card data-testid="card-sessions-over-time">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Sessions over time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : !sessions?.overTime.length ? (
            <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
              No sessions tracked yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sessions.overTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-sessions-by-channel">
        <CardHeader>
          <CardTitle>Sessions by channel</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !sessions?.byChannel.length ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No sessions tracked yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">% of total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.byChannel
                  .slice()
                  .sort((a, b) => b.sessions - a.sessions)
                  .map((row) => (
                    <TableRow key={row.channel} data-testid={`row-channel-${row.channel}`}>
                      <TableCell>{CHANNEL_LABELS[row.channel] ?? row.channel}</TableCell>
                      <TableCell className="text-right">{row.sessions}</TableCell>
                      <TableCell className="text-right">
                        {totalSessions > 0 ? `${Math.round((row.sessions / totalSessions) * 100)}%` : "0%"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-sales-by-channel">
        <CardHeader>
          <CardTitle>Sales attributed to marketing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {salesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !salesByChannel?.length ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No orders in this period
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesByChannel
                  .slice()
                  .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))
                  .map((row) => (
                    <TableRow key={row.channel} data-testid={`row-sales-${row.channel}`}>
                      <TableCell>{CHANNEL_LABELS[row.channel] ?? row.channel}</TableCell>
                      <TableCell className="text-right">{row.orders}</TableCell>
                      <TableCell className="text-right">${parseFloat(row.revenue).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground">
            Attribution only works for orders placed on the same browser that browsed the
            storefront, and only for orders placed after this feature was enabled — past
            orders and cross-device journeys always show as "Unattributed".
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
