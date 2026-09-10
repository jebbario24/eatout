import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionStatus {
  hasSubscription: boolean;
  status: string;
  subscriptionEndsAt: Date | null;
  isActive: boolean;
}

export default function Billing() {
  const { toast } = useToast();
  
  const { data: subscription, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription-status'],
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to cancel subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
      toast({
        title: "Subscription Canceled",
        description: "Your subscription has been canceled successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading billing information...</div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      trial: "secondary",
      past_due: "destructive",
      canceled: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your EatOut subscription</p>
      </div>

      <Card data-testid="card-subscription-status">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>EatOut Platform - $79/month</CardDescription>
            </div>
            {subscription && getStatusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize" data-testid="text-subscription-status">
                {subscription?.status || 'Unknown'}
              </p>
            </div>
            {subscription?.subscriptionEndsAt && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {subscription.status === 'trial' ? 'Trial Ends' : 'Next Billing Date'}
                </p>
                <p className="font-medium" data-testid="text-next-billing-date">
                  {new Date(subscription.subscriptionEndsAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {subscription?.status === 'trial' && subscription.subscriptionEndsAt && (
            <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Free Trial Active</p>
                <p className="text-sm text-muted-foreground">
                  Your trial ends on {new Date(subscription.subscriptionEndsAt).toLocaleDateString()}.
                  Add a payment method to continue using EatOut after the trial period.
                </p>
              </div>
            </div>
          )}

          {subscription?.status === 'past_due' && (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Payment Failed</p>
                <p className="text-sm text-muted-foreground">
                  Your recent payment failed. Please update your payment method to avoid service interruption.
                </p>
              </div>
            </div>
          )}

          {subscription?.isActive && subscription.status !== 'trial' && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                data-testid="button-cancel-subscription"
              >
                {cancelMutation.isPending ? "Canceling..." : "Cancel Subscription"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>View your past invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No billing history available yet
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
