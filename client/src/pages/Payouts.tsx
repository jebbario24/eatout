import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, DollarSign, Clock, CheckCircle2, Calendar, AlertCircle, Banknote } from "lucide-react";
import { format, addDays } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PendingPayoutData {
  pendingAmount: string;
  orderCount: number;
  hasPayoutAccount: boolean;
  payoutSchedule: string;
}

interface PayoutRun {
  id: string;
  totalAmount: string;
  payoutProvider: string;
  payoutTransactionId: string | null;
  status: string;
  failureReason: string | null;
  scheduledFor: string;
  completedAt: string | null;
  createdAt: string;
}

export default function Payouts() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: pendingData, isLoading: pendingLoading } = useQuery<PendingPayoutData>({
    queryKey: ["/api/merchant/payouts/pending"],
  });

  const { data: payoutHistory = [], isLoading: historyLoading } = useQuery<PayoutRun[]>({
    queryKey: ["/api/merchant/payouts/history"],
  });

  const processPayout = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/merchant/payouts/process", "POST");
    },
    onSuccess: () => {
      toast({
        title: "Payout initiated",
        description: "Your payout is being processed. It should arrive in your bank account in 1-3 business days.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/payouts/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/payouts/history"] });
    },
    onError: (error: any) => {
      toast({
        title: "Payout failed",
        description: error.message || "Failed to process payout. Please check your bank account details.",
        variant: "destructive",
      });
    },
  });

  const pendingAmount = pendingData ? parseFloat(pendingData.pendingAmount) : 0;
  const totalPaidOut = payoutHistory
    .filter(run => run.status === 'completed')
    .reduce((sum, run) => sum + parseFloat(run.totalAmount), 0);

  const calculateNextPayoutDate = () => {
    if (!pendingData || !payoutHistory.length) return null;
    
    const lastPayoutDate = payoutHistory[0] ? new Date(payoutHistory[0].createdAt) : new Date();
    const daysToAdd = pendingData.payoutSchedule === 'daily' ? 1 : 7;
    return addDays(lastPayoutDate, daysToAdd);
  };

  const nextPayoutDate = calculateNextPayoutDate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments & Payouts</h1>
          <p className="text-muted-foreground mt-1">
            Automated payouts to your bank account
          </p>
        </div>
      </div>

      {!pendingData?.hasPayoutAccount && !pendingLoading && (
        <Alert data-testid="alert-no-payout-account">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to configure your bank account details in Settings before you can receive payouts.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {pendingLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-pending-amount">
                  ${pendingAmount.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingData?.orderCount || 0} orders
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid Out</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-paid">
                  ${totalPaidOut.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {payoutHistory.filter(r => r.status === 'completed').length} payouts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payout Schedule</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize" data-testid="text-payout-schedule">
                  {pendingData?.payoutSchedule || 'Weekly'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatic payouts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next Payout</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold" data-testid="text-next-payout-date">
                  {nextPayoutDate ? format(nextPayoutDate, 'MMM dd') : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingAmount >= 10 ? 'If minimum met' : 'Min $10 required'}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {pendingData?.hasPayoutAccount && pendingAmount >= 10 && (
        <Card>
          <CardHeader>
            <CardTitle>Request Manual Payout</CardTitle>
            <CardDescription>
              Process your pending earnings immediately instead of waiting for the scheduled payout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => processPayout.mutate()}
              disabled={processPayout.isPending}
              data-testid="button-request-payout"
            >
              {processPayout.isPending ? 'Processing...' : `Request Payout ($${pendingAmount.toFixed(2)})`}
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="history" className="w-full">
        <TabsList>
          <TabsTrigger value="history" data-testid="tab-payout-history">Payout History</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          {historyLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : payoutHistory.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payout history yet</p>
                  <p className="text-sm mt-2">Completed payouts will appear here</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>All payouts sent to your bank account</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Payout ID</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutHistory.map((run) => (
                      <TableRow key={run.id} data-testid={`payout-run-${run.id}`}>
                        <TableCell className="text-sm">
                          {run.completedAt 
                            ? format(new Date(run.completedAt), 'MMM dd, yyyy')
                            : format(new Date(run.scheduledFor), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{run.id.substring(0, 12)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${parseFloat(run.totalAmount).toFixed(2)}
                        </TableCell>
                        <TableCell className="capitalize">{run.payoutProvider}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {run.payoutTransactionId ? run.payoutTransactionId.substring(0, 12) : '-'}
                        </TableCell>
                        <TableCell>
                          {run.status === 'completed' ? (
                            <Badge variant="default" className="bg-green-500">Completed</Badge>
                          ) : run.status === 'pending' ? (
                            <Badge variant="secondary">Pending</Badge>
                          ) : (
                            <Badge variant="destructive" title={run.failureReason || undefined}>
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
