import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Edit, Trash2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Merchant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  customDomain: string;
  email: string;
  phone: string;
  currency: string;
  country: string;
  businessType?: string;
  isActive: boolean;
  createdAt: string;
  stripeAccountId: string;
  paypalMerchantId: string;
  owner: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    subscriptionStatus: string;
    role: string;
  };
}

const BUSINESS_TYPES = ['grocery', 'pharmacy', 'flowers', 'retail'] as const;

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  grocery: "Grocery Store",
  pharmacy: "Pharmacy",
  flowers: "Flower Shop",
  retail: "Retail Shop",
};

export default function AdminMerchants() {
  const { toast } = useToast();
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    subdomain: "",
    isActive: true,
    businessType: "retail",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: merchants, isLoading } = useQuery<Merchant[]>({
    queryKey: ['/api/admin/merchants'],
  });

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of merchants || []) {
      const type = r.businessType || 'retail';
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }, [merchants]);

  const filteredMerchants = useMemo(() => {
    return (merchants || []).filter((r) => {
      const matchesType = typeFilter === "all" || (r.businessType || 'retail') === typeFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q ||
        r.name.toLowerCase().includes(q) ||
        r.owner.email.toLowerCase().includes(q) ||
        `${r.owner.firstName} ${r.owner.lastName}`.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [merchants, typeFilter, searchQuery]);

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/admin/merchants/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      toast({
        title: "Merchant Updated",
        description: "Merchant has been updated successfully.",
      });
      setEditingMerchant(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update merchant.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/merchants/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      toast({
        title: "Merchant Deleted",
        description: "Merchant has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete merchant.",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setEditForm({
      name: merchant.name,
      subdomain: merchant.subdomain,
      isActive: merchant.isActive,
      businessType: merchant.businessType || "retail",
    });
  };

  const handleEditSubmit = () => {
    if (!editingMerchant) return;
    editMutation.mutate({ id: editingMerchant.id, data: editForm });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading merchants...</div>
      </div>
    );
  }

  const getSubscriptionBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      trial: "secondary",
      past_due: "destructive",
      canceled: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">All Merchants</h1>
        <p className="text-muted-foreground">Manage all merchants on the platform — grocery, pharmacy, flowers, and retail</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter("all")}
          className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${typeFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "hover-elevate"}`}
          data-testid="button-filter-type-all"
        >
          All ({merchants?.length || 0})
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or owner email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-merchants"
        />
      </div>

      <div className="grid gap-4">
        {filteredMerchants.length > 0 ? (
          filteredMerchants.map((merchant) => (
            <Card key={merchant.id} data-testid={`card-merchant-${merchant.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      <span data-testid={`text-merchant-name-${merchant.id}`}>{merchant.name}</span>
                      <Badge variant="secondary" className="no-default-hover-elevate font-normal">
                        {BUSINESS_TYPE_LABELS[merchant.businessType || 'retail'] || merchant.businessType}
                      </Badge>
                      {merchant.isActive ? (
                        <Badge variant="default" className="no-default-hover-elevate">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="no-default-hover-elevate">Inactive</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {merchant.subdomain && (
                        <span className="inline-flex items-center gap-1">
                          <a 
                            href={`https://${merchant.subdomain}.eatout.app`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                            data-testid={`link-storefront-${merchant.id}`}
                          >
                            {merchant.subdomain}.eatout.app
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {getSubscriptionBadge(merchant.owner.subscriptionStatus)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Owner</p>
                    <p className="font-medium" data-testid={`text-owner-name-${merchant.id}`}>
                      {merchant.owner.firstName} {merchant.owner.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{merchant.owner.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location & Currency</p>
                    <p className="font-medium">{merchant.country}</p>
                    <p className="text-sm text-muted-foreground">{merchant.currency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Integration</p>
                    <div className="flex gap-2 mt-1">
                      {merchant.stripeAccountId && (
                        <Badge variant="secondary" className="no-default-hover-elevate">Stripe Connected</Badge>
                      )}
                      {merchant.paypalMerchantId && (
                        <Badge variant="secondary" className="no-default-hover-elevate">PayPal Connected</Badge>
                      )}
                      {!merchant.stripeAccountId && !merchant.paypalMerchantId && (
                        <span className="text-sm text-muted-foreground">No payment methods</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Joined</p>
                    <p className="font-medium">{new Date(merchant.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-3 border-t">
                  <Dialog open={editingMerchant?.id === merchant.id} onOpenChange={(open) => !open && setEditingMerchant(null)}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditClick(merchant)}
                        data-testid={`button-edit-${merchant.id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent data-testid="dialog-edit-merchant">
                      <DialogHeader>
                        <DialogTitle>Edit Merchant</DialogTitle>
                        <DialogDescription>
                          Update merchant details and settings
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Merchant Name</Label>
                          <Input
                            id="name"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            data-testid="input-edit-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="businessType">Business Type</Label>
                          <Select
                            value={editForm.businessType}
                            onValueChange={(value) => setEditForm({ ...editForm, businessType: value })}
                          >
                            <SelectTrigger id="businessType" data-testid="select-edit-business-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BUSINESS_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {BUSINESS_TYPE_LABELS[type]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="subdomain">Subdomain</Label>
                          <Input
                            id="subdomain"
                            value={editForm.subdomain}
                            onChange={(e) => setEditForm({ ...editForm, subdomain: e.target.value })}
                            data-testid="input-edit-subdomain"
                          />
                          <p className="text-sm text-muted-foreground">
                            {editForm.subdomain}.eatout.app
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="active">Active Status</Label>
                            <p className="text-sm text-muted-foreground">
                              {editForm.isActive ? "Merchant is active" : "Merchant is inactive"}
                            </p>
                          </div>
                          <Switch
                            id="active"
                            checked={editForm.isActive}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                            data-testid="switch-edit-active"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setEditingMerchant(null)}
                          data-testid="button-cancel-edit"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleEditSubmit}
                          disabled={editMutation.isPending}
                          data-testid="button-save-edit"
                        >
                          {editMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid={`button-delete-${merchant.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent data-testid="dialog-delete-merchant">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Merchant?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete <strong>{merchant.name}</strong> and all associated data including catalog items, orders, reservations, and staff. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(merchant.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          data-testid="button-confirm-delete"
                        >
                          {deleteMutation.isPending ? "Deleting..." : "Delete Merchant"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {merchants && merchants.length > 0 ? "No merchants match your search or filter" : "No merchants yet"}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
