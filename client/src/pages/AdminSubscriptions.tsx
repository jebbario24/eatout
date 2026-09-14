import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CheckCircle, XCircle, Clock, DollarSign, Key, AlertTriangle, MoreVertical, Ban, Trash2, CalendarPlus } from "lucide-react";

interface Merchant {
  id: string;
  name: string;
  subdomain: string;
  businessType?: string;
  ownerEmail: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  manuallyGrantedAccess: boolean;
  accessGrantedBy: string | null;
  accessGrantedAt: string | null;
  accessNotes: string | null;
  createdAt: string;
}

const BUSINESS_TYPES = ['grocery', 'pharmacy', 'flowers', 'retail'] as const;

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  grocery: "Grocery Store",
  pharmacy: "Pharmacy",
  flowers: "Flower Shop",
  retail: "Retail Shop",
};

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [accessNotes, setAccessNotes] = useState("");
  const [extendDays, setExtendDays] = useState("7");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: merchants = [], isLoading } = useQuery<Merchant[]>({
    queryKey: ['/api/admin/subscriptions'],
  });

  const grantAccessMutation = useMutation({
    mutationFn: async ({ merchantId, notes }: { merchantId: string; notes: string }) => {
      return await apiRequest(`/api/admin/merchants/${merchantId}/grant-access`, 'POST', { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      toast({
        title: "Access Granted",
        description: "Merchant can now access the platform without subscription.",
      });
      setShowGrantDialog(false);
      setSelectedMerchant(null);
      setAccessNotes("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to grant manual access.",
        variant: "destructive",
      });
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (merchantId: string) => {
      return await apiRequest(`/api/admin/merchants/${merchantId}/revoke-access`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      toast({
        title: "Access Revoked",
        description: "Manual access has been revoked. Subscription rules now apply.",
      });
      setShowRevokeDialog(false);
      setSelectedMerchant(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to revoke manual access.",
        variant: "destructive",
      });
    },
  });

  const handleGrantAccess = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setShowGrantDialog(true);
  };

  const handleRevokeAccess = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setShowRevokeDialog(true);
  };

  const handleGrantConfirm = () => {
    if (!selectedMerchant) return;
    grantAccessMutation.mutate({ 
      merchantId: selectedMerchant.id, 
      notes: accessNotes 
    });
  };

  const handleRevokeConfirm = () => {
    if (!selectedMerchant) return;
    revokeAccessMutation.mutate(selectedMerchant.id);
  };

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (merchantId: string) => {
      return await apiRequest(`/api/admin/merchants/${merchantId}/cancel-subscription`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      toast({
        title: "Subscription Cancelled",
        description: "The merchant's subscription has been cancelled.",
      });
      setShowCancelDialog(false);
      setSelectedMerchant(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel subscription.",
        variant: "destructive",
      });
    },
  });

  const deleteMerchantMutation = useMutation({
    mutationFn: async (merchantId: string) => {
      return await apiRequest(`/api/admin/merchants/${merchantId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      toast({
        title: "Merchant Deleted",
        description: "The merchant and all its data has been permanently deleted.",
      });
      setShowDeleteDialog(false);
      setSelectedMerchant(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete merchant.",
        variant: "destructive",
      });
    },
  });

  const extendTrialMutation = useMutation({
    mutationFn: async ({ merchantId, days }: { merchantId: string; days: number }) => {
      return await apiRequest(`/api/admin/merchants/${merchantId}/extend-trial`, 'POST', { days });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      toast({
        title: "Trial Extended",
        description: `Trial period has been extended by ${extendDays} days.`,
      });
      setShowExtendDialog(false);
      setSelectedMerchant(null);
      setExtendDays("7");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to extend trial.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (merchant: Merchant) => {
    if (merchant.manuallyGrantedAccess) {
      return (
        <Badge variant="default" data-testid="badge-manual-access">
          <Key className="w-3 h-3 mr-1" />
          Manual Access
        </Badge>
      );
    }

    if (merchant.subscriptionStatus === 'active') {
      return (
        <Badge variant="default" data-testid="badge-active">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    }

    if (merchant.subscriptionStatus === 'trial' || merchant.subscriptionStatus === 'trialing') {
      return (
        <Badge variant="secondary" data-testid="badge-trial">
          <Clock className="w-3 h-3 mr-1" />
          Trial
        </Badge>
      );
    }

    return (
      <Badge variant="destructive" data-testid="badge-inactive">
        <XCircle className="w-3 h-3 mr-1" />
        {merchant.subscriptionStatus || 'Inactive'}
      </Badge>
    );
  };

  const typeCounts = merchants.reduce<Record<string, number>>((counts, r) => {
    const type = r.businessType || 'retail';
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

  const filteredMerchants = merchants.filter(r => {
    const matchesType = typeFilter === "all" || (r.businessType || 'retail') === typeFilter;
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const activeSubscriptions = merchants.filter(r => 
    r.subscriptionStatus === 'active' && !r.manuallyGrantedAccess
  ).length;
  const trialSubscriptions = merchants.filter(r => 
    (r.subscriptionStatus === 'trial' || r.subscriptionStatus === 'trialing') && !r.manuallyGrantedAccess
  ).length;
  const manualAccessCount = merchants.filter(r => r.manuallyGrantedAccess).length;
  const mrr = activeSubscriptions * 79;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading subscriptions...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <p className="text-muted-foreground">Manage subscriptions and grant manual access</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-count">
              {activeSubscriptions}
            </div>
            <p className="text-xs text-muted-foreground">Paying customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-trial-count">
              {trialSubscriptions}
            </div>
            <p className="text-xs text-muted-foreground">In trial period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Access</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-manual-count">
              {manualAccessCount}
            </div>
            <p className="text-xs text-muted-foreground">Admin granted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-mrr">
              ${mrr}
            </div>
            <p className="text-xs text-muted-foreground">From subscriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Business Type Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter("all")}
          className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${typeFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "hover-elevate"}`}
          data-testid="button-filter-type-all"
        >
          All ({merchants.length})
        </button>
        {BUSINESS_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${typeFilter === type ? "bg-primary text-primary-foreground border-primary" : "hover-elevate"}`}
            data-testid={`button-filter-type-${type}`}
          >
            {BUSINESS_TYPE_LABELS[type]} ({typeCounts[type] || 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search merchants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search"
        />
      </div>

      {/* Merchants List */}
      <div className="grid gap-4">
        {filteredMerchants.map((merchant) => (
          <Card key={merchant.id} data-testid={`card-merchant-${merchant.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                    {merchant.name}
                    <Badge variant="secondary" className="no-default-hover-elevate font-normal text-xs">
                      {BUSINESS_TYPE_LABELS[merchant.businessType || 'retail'] || merchant.businessType}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {merchant.subdomain} • {merchant.ownerEmail}
                  </CardDescription>
                </div>
                {getStatusBadge(merchant)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Manual Access Info */}
              {merchant.manuallyGrantedAccess && (
                <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-primary mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">Manual Access Granted</p>
                      {merchant.accessNotes && (
                        <p className="text-sm text-muted-foreground">
                          Note: {merchant.accessNotes}
                        </p>
                      )}
                      {merchant.accessGrantedAt && (
                        <p className="text-xs text-muted-foreground">
                          Granted on {new Date(merchant.accessGrantedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Subscription Info */}
              {!merchant.manuallyGrantedAccess && (
                <div className="text-sm space-y-1">
                  {merchant.trialEndsAt && (
                    <p>
                      <span className="text-muted-foreground">Trial ends:</span>{' '}
                      {new Date(merchant.trialEndsAt).toLocaleDateString()}
                    </p>
                  )}
                  {merchant.subscriptionEndsAt && (
                    <p>
                      <span className="text-muted-foreground">Subscription ends:</span>{' '}
                      {new Date(merchant.subscriptionEndsAt).toLocaleDateString()}
                    </p>
                  )}
                  {merchant.createdAt && (
                    <p>
                      <span className="text-muted-foreground">Created:</span>{' '}
                      {new Date(merchant.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {merchant.manuallyGrantedAccess ? (
                  <Button
                    variant="destructive"
                    onClick={() => handleRevokeAccess(merchant)}
                    disabled={revokeAccessMutation.isPending}
                    data-testid="button-revoke-access"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Revoke Manual Access
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleGrantAccess(merchant)}
                    disabled={grantAccessMutation.isPending}
                    data-testid="button-grant-access"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Grant Manual Access
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" data-testid="button-more-actions">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedMerchant(merchant);
                        setShowExtendDialog(true);
                      }}
                      data-testid="action-extend-trial"
                    >
                      <CalendarPlus className="w-4 h-4 mr-2" />
                      Extend Trial
                    </DropdownMenuItem>
                    
                    {merchant.subscriptionStatus === 'active' && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedMerchant(merchant);
                          setShowCancelDialog(true);
                        }}
                        data-testid="action-cancel-subscription"
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Cancel Subscription
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedMerchant(merchant);
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive focus:text-destructive"
                      data-testid="action-delete-merchant"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Merchant
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredMerchants.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No merchants found
            </CardContent>
          </Card>
        )}
      </div>

      {/* Grant Access Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent data-testid="dialog-grant-access">
          <DialogHeader>
            <DialogTitle>Grant Manual Access</DialogTitle>
            <DialogDescription>
              This will give <strong>{selectedMerchant?.name}</strong> full access to the platform
              without requiring a subscription. Use this for special arrangements or payment issues.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="access-notes">Notes (optional)</Label>
            <Textarea
              id="access-notes"
              placeholder="e.g., Payment arrangement with owner, Special discount, Beta tester..."
              value={accessNotes}
              onChange={(e) => setAccessNotes(e.target.value)}
              data-testid="input-access-notes"
            />
            <p className="text-xs text-muted-foreground">
              These notes will help you remember why access was granted.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGrantDialog(false)}
              data-testid="button-cancel-grant"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGrantConfirm}
              disabled={grantAccessMutation.isPending}
              data-testid="button-confirm-grant"
            >
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Access Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent data-testid="dialog-revoke-access">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Manual Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove manual access for <strong>{selectedMerchant?.name}</strong>.
              Normal subscription rules will apply, and they may lose access if their subscription
              is not active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-revoke">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConfirm}
              disabled={revokeAccessMutation.isPending}
              data-testid="button-confirm-revoke"
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extend Trial Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent data-testid="dialog-extend-trial">
          <DialogHeader>
            <DialogTitle>Extend Trial Period</DialogTitle>
            <DialogDescription>
              Extend the trial period for <strong>{selectedMerchant?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="extend-days">Number of Days</Label>
            <Input
              id="extend-days"
              type="number"
              min="1"
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value)}
              data-testid="input-extend-days"
            />
            <p className="text-xs text-muted-foreground">
              This will add the specified number of days to their current trial period.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExtendDialog(false)}
              data-testid="button-cancel-extend"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedMerchant) return;
                const days = parseInt(extendDays);
                if (isNaN(days) || days < 1) {
                  toast({
                    title: "Invalid Input",
                    description: "Please enter a valid number of days (minimum 1)",
                    variant: "destructive",
                  });
                  return;
                }
                extendTrialMutation.mutate({ 
                  merchantId: selectedMerchant.id, 
                  days 
                });
              }}
              disabled={extendTrialMutation.isPending}
              data-testid="button-confirm-extend"
            >
              Extend Trial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent data-testid="dialog-cancel-subscription">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the active subscription for <strong>{selectedMerchant?.name}</strong>.
              They will retain access until their current billing period ends, after which they will
              need to resubscribe or you can grant manual access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selectedMerchant) return;
                cancelSubscriptionMutation.mutate(selectedMerchant.id);
              }}
              disabled={cancelSubscriptionMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Merchant Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete-merchant">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Merchant?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-destructive font-semibold">Warning: This action cannot be undone!</span>
              <br /><br />
              This will permanently delete <strong>{selectedMerchant?.name}</strong> and all associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All catalog items and categories</li>
                <li>All orders and order history</li>
                <li>All customer reviews and ratings</li>
                <li>All settings and customizations</li>
                <li>Financial records and payout information</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selectedMerchant) return;
                deleteMerchantMutation.mutate(selectedMerchant.id);
              }}
              disabled={deleteMerchantMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
