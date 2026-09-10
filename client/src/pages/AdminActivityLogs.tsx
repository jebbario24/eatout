import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Activity, Filter, Calendar } from "lucide-react";
import { format } from "date-fns";

const categoryColors: Record<string, string> = {
  restaurant: "bg-blue-500",
  driver: "bg-green-500",
  subscription: "bg-purple-500",
  user: "bg-yellow-500",
  payout: "bg-orange-500",
  review: "bg-pink-500",
  settings: "bg-gray-500",
};

// 'restaurant' is still the actual actionCategory value the backend logs (and the
// filter matches against) — this only overrides how it's labeled for the admin.
const categoryLabels: Record<string, string> = {
  restaurant: "Merchant",
};

export default function AdminActivityLogs() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['/api/admin/activity-logs', categoryFilter !== 'all' ? categoryFilter : undefined],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') {
        params.append('actionCategory', categoryFilter);
      }
      
      // Date filtering
      if (dateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.append('startDate', today.toISOString());
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.append('startDate', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        params.append('startDate', monthAgo.toISOString());
      }
      
      const response = await fetch(`/api/admin/activity-logs?${params}`);
      return response.json();
    },
  });

  const filteredLogs = logs.filter((log: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.description.toLowerCase().includes(query) ||
      log.userEmail.toLowerCase().includes(query) ||
      log.targetName?.toLowerCase().includes(query) ||
      log.actionType.toLowerCase().includes(query)
    );
  });

  const categories = ['all', 'restaurant', 'driver', 'subscription', 'user', 'payout', 'review', 'settings'];
  const dateRanges = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8" />
          Activity Logs
        </h1>
        <p className="text-muted-foreground">Track all administrative actions across the platform</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-category-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabels[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger data-testid="select-date-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateRanges.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-logs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
          <CardDescription>
            {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading activity logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No activity logs found</div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover-elevate"
                  data-testid={`activity-log-${log.id}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 ${categoryColors[log.actionCategory] || 'bg-gray-500'}`} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" data-testid={`badge-category-${log.id}`}>
                            {categoryLabels[log.actionCategory] || log.actionCategory}
                          </Badge>
                          <span className="text-sm text-muted-foreground" data-testid={`text-action-type-${log.id}`}>
                            {log.actionType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="mt-2" data-testid={`text-description-${log.id}`}>
                          {log.description}
                        </p>
                        {log.targetName && (
                          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-target-${log.id}`}>
                            Target: <span className="font-medium">{log.targetName}</span>
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground flex-shrink-0">
                        <div className="flex items-center gap-1" data-testid={`text-timestamp-${log.id}`}>
                          <Calendar className="h-3 w-3" />
                          {format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}
                        </div>
                        <div className="mt-1" data-testid={`text-user-${log.id}`}>
                          By: {log.userEmail}
                        </div>
                      </div>
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
