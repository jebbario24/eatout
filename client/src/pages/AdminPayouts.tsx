import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  RefreshCw,
  Ban,
  CheckSquare,
} from "lucide-react";

export default function AdminPayouts() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<{ type: string; payout: any } | null>(null);
  const [transactionId, setTransactionId] = useState("");

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ['/api/admin/payouts', statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" 
        ? '/api/admin/payouts' 
        : `/api/admin/payouts?status=${statusFilter}`;
      return fetch(url).then(res => res.json());
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      return apiRequest('POST', `/api/admin/payouts/${payoutId}/retry`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts'] });
      toast({
        title: "Payout Retried",
        description: "The payout has been rescheduled for processing.",
      });
      setSelectedAction(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to retry payout",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      return apiRequest('POST', `/api/admin/payouts/${payoutId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts'] });
      toast({
        title: "Payout Cancelled",
        description: "The payout has been cancelled successfully.",
      });
      setSelectedAction(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to cancel payout",
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ payoutId, transactionId }: { payoutId: string; transactionId: string }) => {
      return apiRequest('POST', `/api/admin/payouts/${payoutId}/mark-paid`, { transactionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts'] });
      toast({
        title: "Payout Marked as Paid",
        description: "The payout has been successfully marked as completed.",
      });
      setSelectedAction(null);
      setTransactionId("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to mark payout as paid",
      });
    },
  });

  const stats = {
    total: payouts.reduce((sum: number, p: any) => sum + parseFloat(p.totalAmount || 0), 0),
    pending: payouts.filter((p: any) => p.status === 'pending').length,
    completed: payouts.filter((p: any) => p.status === 'completed').length,
    failed: payouts.filter((p: any) => p.status === 'failed').length,
  };

  const getStatusBadge = (status: string, payoutId: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500" data-testid={`badge-status-completed-${payoutId}`}>
          <CheckCircle className="w-3 h-3 mr-1" />Completed
        </Badge>;
      case 'pending':
        return <Badge variant="secondary" data-testid={`badge-status-pending-${payoutId}`}>
          <Clock className="w-3 h-3 mr-1" />Pending
        </Badge>;
      case 'processing':
        return <Badge variant="default" data-testid={`badge-status-processing-${payoutId}`}>
          <RefreshCw className="w-3 h-3 mr-1" />Processing
        </Badge>;
      case 'failed':
        return <Badge variant="destructive" data-testid={`badge-status-failed-${payoutId}`}>
          <XCircle className="w-3 h-3 mr-1" />Failed
        </Badge>;
      case 'cancelled':
        return <Badge variant="outline" data-testid={`badge-status-cancelled-${payoutId}`}>
          <Ban className="w-3 h-3 mr-1" />Cancelled
        </Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-status-${status}-${payoutId}`}>{status}</Badge>;
    }
  };

  const handleRetry = (payout: any) => {
    setSelectedAction({ type: 'retry', payout });
  };

  const handleCancel = (payout: any) => {
    setSelectedAction({ type: 'cancel', payout });
  };

  const handleMarkPaid = (payout: any) => {
    setSelectedAction({ type: 'mark-paid', payout });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading payout data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payout Management</h1>
        <p className="text-muted-foreground">
          Manage and monitor all merchant payouts
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-payouts">
              ${stats.total.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {payouts.length} total runs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending-payouts">
              {stats.pending}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-completed-payouts">
              {stats.completed}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-failed-payouts">
              {stats.failed}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Payout Runs</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Scheduled For</TableHead>
                <TableHead>Completed At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout: any) => (
                <TableRow key={payout.id} data-testid={`row-payout-${payout.id}`}>
                  <TableCell className="font-medium" data-testid={`text-restaurant-${payout.id}`}>
                    {payout.restaurantName}
                  </TableCell>
                  <TableCell data-testid={`text-amount-${payout.id}`}>
                    ${parseFloat(payout.totalAmount).toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(payout.status, payout.id)}</TableCell>
                  <TableCell data-testid={`text-provider-${payout.id}`}>
                    {payout.payoutProvider}
                  </TableCell>
                  <TableCell data-testid={`text-transaction-${payout.id}`}>
                    {payout.payoutTransactionId || '-'}
                  </TableCell>
                  <TableCell data-testid={`text-scheduled-${payout.id}`}>
                    {new Date(payout.scheduledFor).toLocaleString()}
                  </TableCell>
                  <TableCell data-testid={`text-completed-${payout.id}`}>
                    {payout.completedAt 
                      ? new Date(payout.completedAt).toLocaleString()
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          data-testid={`button-actions-${payout.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {payout.status === 'failed' && (
                          <DropdownMenuItem 
                            onClick={() => handleRetry(payout)}
                            data-testid="action-retry"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry Payout
                          </DropdownMenuItem>
                        )}
                        
                        {payout.status === 'pending' && (
                          <DropdownMenuItem 
                            onClick={() => handleCancel(payout)}
                            data-testid="action-cancel"
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Cancel Payout
                          </DropdownMenuItem>
                        )}
                        
                        {(payout.status === 'pending' || payout.status === 'failed') && (
                          <DropdownMenuItem 
                            onClick={() => handleMarkPaid(payout)}
                            data-testid="action-mark-paid"
                          >
                            <CheckSquare className="mr-2 h-4 w-4" />
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                        
                        {payout.failureReason && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled data-testid="text-failure-reason">
                              <div className="text-xs">
                                <strong>Failure:</strong> {payout.failureReason}
                              </div>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              
              {payouts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No payout runs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedAction?.type === 'retry' && (
        <AlertDialog open onOpenChange={() => setSelectedAction(null)}>
          <AlertDialogContent data-testid="dialog-retry-confirm">
            <AlertDialogHeader>
              <AlertDialogTitle>Retry Failed Payout</AlertDialogTitle>
              <AlertDialogDescription>
                This will reschedule the payout for {selectedAction.payout.restaurantName} 
                (${parseFloat(selectedAction.payout.totalAmount).toFixed(2)}) for immediate processing.
                Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-retry">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => retryMutation.mutate(selectedAction.payout.id)}
                disabled={retryMutation.isPending}
                data-testid="button-confirm-retry"
              >
                {retryMutation.isPending ? 'Retrying...' : 'Retry Payout'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {selectedAction?.type === 'cancel' && (
        <AlertDialog open onOpenChange={() => setSelectedAction(null)}>
          <AlertDialogContent data-testid="dialog-cancel-confirm">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Payout</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel the payout for {selectedAction.payout.restaurantName} 
                (${parseFloat(selectedAction.payout.totalAmount).toFixed(2)}).
                This action cannot be undone. Are you sure?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-cancel">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => cancelMutation.mutate(selectedAction.payout.id)}
                disabled={cancelMutation.isPending}
                data-testid="button-confirm-cancel"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Payout'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {selectedAction?.type === 'mark-paid' && (
        <AlertDialog open onOpenChange={() => { setSelectedAction(null); setTransactionId(""); }}>
          <AlertDialogContent data-testid="dialog-mark-paid">
            <AlertDialogHeader>
              <AlertDialogTitle>Manually Mark as Paid</AlertDialogTitle>
              <AlertDialogDescription>
                Mark the payout for {selectedAction.payout.restaurantName} 
                (${parseFloat(selectedAction.payout.totalAmount).toFixed(2)}) as completed.
                Please provide the transaction ID from your payment provider.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="transaction-id">Transaction ID</Label>
              <Input
                id="transaction-id"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter transaction ID"
                data-testid="input-transaction-id"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => setTransactionId("")}
                data-testid="button-cancel-mark-paid"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => markPaidMutation.mutate({ 
                  payoutId: selectedAction.payout.id, 
                  transactionId 
                })}
                disabled={markPaidMutation.isPending || !transactionId.trim()}
                data-testid="button-confirm-mark-paid"
              >
                {markPaidMutation.isPending ? 'Processing...' : 'Mark as Paid'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
