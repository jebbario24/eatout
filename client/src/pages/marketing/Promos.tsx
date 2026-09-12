import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Percent, Calendar, Users, Gift } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

// apiRequest throws `Error("<status>: <json-or-text body>")` on non-2xx responses.
// Pull the server's own message out of that so the toast shown to the merchant
// is specific ("This code is already in use") instead of a generic fallback.
function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const bodyText = error.message.replace(/^\d+:\s*/, "");
    try {
      const parsed = JSON.parse(bodyText);
      if (parsed?.message) return parsed.message;
    } catch {
      // body wasn't JSON — fall through to the fallback
    }
  }
  return fallback;
}

type MenuItem = {
  id: string;
  name: string;
  price: string;
};

type PromoFromDB = {
  id: string;
  promoCode: string;
  promoType: string;
  discountValue: string | null;
  redemptionCount: number;
  redemptionLimit: number | null;
  isActive: boolean;
  endsAt: string | null;
  startsAt: string;
  buyItemId?: string | null;
  getItemId?: string | null;
  buyQuantity?: number;
  getQuantity?: number;
  name: string;
  description: string | null;
};

type Promo = {
  id: string;
  code: string;
  type: string;
  value: number;
  redemptions: number;
  maxUses: number | null;
  isActive: boolean;
  expiresAt: string | null;
  startsAt: string;
  buyItemId?: string | null;
  getItemId?: string | null;
  buyQuantity?: number;
  getQuantity?: number;
  name: string;
  description: string | null;
};

// Transform database promo to frontend format
function transformPromo(dbPromo: PromoFromDB): Promo {
  return {
    id: dbPromo.id,
    code: dbPromo.promoCode || '',
    type: dbPromo.promoType,
    value: dbPromo.discountValue ? parseFloat(dbPromo.discountValue) : 0,
    redemptions: dbPromo.redemptionCount || 0,
    maxUses: dbPromo.redemptionLimit,
    isActive: dbPromo.isActive,
    expiresAt: dbPromo.endsAt,
    startsAt: dbPromo.startsAt,
    buyItemId: dbPromo.buyItemId,
    getItemId: dbPromo.getItemId,
    buyQuantity: dbPromo.buyQuantity,
    getQuantity: dbPromo.getQuantity,
    name: dbPromo.name,
    description: dbPromo.description,
  };
}

export default function Promos() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const [newPromo, setNewPromo] = useState({
    name: '',
    code: '',
    type: 'percentage',
    value: 0,
    maxUses: null as number | null,
    isActive: true,
    startsAt: new Date().toISOString().slice(0, 10),
    expiresAt: null as string | null,
    buyItemId: null as string | null,
    getItemId: null as string | null,
    buyQuantity: 1,
    getQuantity: 1,
  });

  // Fetch menu items for BOGO selection
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu/items'],
  });

  // Fetch promos from backend
  const { data: promosFromDB = [], isLoading } = useQuery<PromoFromDB[]>({
    queryKey: ['/api/promos'],
  });

  const promos = promosFromDB.map(transformPromo);

  // Create promo mutation
  const createPromoMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/promos', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/promos'] });
      setCreateDialogOpen(false);
      toast({ title: "Success", description: "Promo code created successfully" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: extractErrorMessage(error, "Failed to create promo code"),
      });
    },
  });

  // Update promo mutation
  const updatePromoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/promos/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/promos'] });
      setEditDialogOpen(false);
      setEditingPromo(null);
      toast({ title: "Success", description: "Promo updated successfully" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: extractErrorMessage(error, "Failed to update promo"),
      });
    },
  });

  // Delete promo mutation
  const deletePromoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/promos/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/promos'] });
      toast({ title: "Success", description: "Promo deleted successfully" });
    },
    onError: () => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Failed to delete promo" 
      });
    },
  });

  const totalRedemptions = promos.reduce((sum, p) => sum + p.redemptions, 0);
  const activePromos = promos.filter(p => p.isActive).length;

  const getMenuItemName = (itemId: string | null | undefined) => {
    if (!itemId) return 'Unknown';
    const item = menuItems.find(m => m.id === itemId);
    return item?.name || 'Unknown Item';
  };

  const handleEditClick = (promo: Promo) => {
    setEditingPromo({ ...promo });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingPromo) return;
    
    // Validation for BOGO
    if (editingPromo.type === 'buy_x_get_y') {
      if (!editingPromo.buyItemId || !editingPromo.getItemId) {
        toast({ 
          variant: "destructive", 
          title: "Missing items", 
          description: "Please select both buy and get items for BOGO promotion" 
        });
        return;
      }
      if ((editingPromo.buyQuantity || 0) < 1 || (editingPromo.getQuantity || 0) < 1) {
        toast({ 
          variant: "destructive", 
          title: "Invalid quantities", 
          description: "Quantities must be at least 1" 
        });
        return;
      }
    }
    
    // Transform frontend format to backend format
    const updateData = {
      name: editingPromo.name,
      description: editingPromo.description,
      promoCode: editingPromo.code,
      promoType: editingPromo.type,
      discountValue: editingPromo.value.toString(),
      redemptionLimit: editingPromo.maxUses,
      isActive: editingPromo.isActive,
      startsAt: editingPromo.startsAt ? new Date(editingPromo.startsAt) : new Date(),
      endsAt: editingPromo.expiresAt ? new Date(editingPromo.expiresAt) : null,
      buyItemId: editingPromo.buyItemId,
      getItemId: editingPromo.getItemId,
      buyQuantity: editingPromo.buyQuantity,
      getQuantity: editingPromo.getQuantity,
    };
    
    updatePromoMutation.mutate({ id: editingPromo.id, data: updateData });
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingPromo(null);
  };

  const handleOpenCreateDialog = () => {
    setNewPromo({
      name: '',
      code: '',
      type: 'percentage',
      value: 0,
      maxUses: null,
      isActive: true,
      startsAt: new Date().toISOString().slice(0, 10),
      expiresAt: null,
      buyItemId: null,
      getItemId: null,
      buyQuantity: 1,
      getQuantity: 1,
    });
    setCreateDialogOpen(true);
  };

  const handleSaveNewPromo = () => {
    const trimmedCode = newPromo.code.trim().toUpperCase();
    const trimmedName = newPromo.name.trim();
    
    if (!trimmedName) {
      toast({ variant: "destructive", title: "Invalid name", description: "Promo name is required" });
      return;
    }
    
    if (!trimmedCode) {
      toast({ variant: "destructive", title: "Invalid code", description: "Promo code is required" });
      return;
    }

    if (promos.some(p => p.code === trimmedCode)) {
      toast({ variant: "destructive", title: "Duplicate code", description: "This promo code already exists" });
      return;
    }

    // Validation for standard promos
    if (newPromo.type !== 'free_delivery' && newPromo.type !== 'buy_x_get_y') {
      if (newPromo.value <= 0) {
        toast({ variant: "destructive", title: "Invalid value", description: "Discount value must be greater than 0" });
        return;
      }
      if (newPromo.type === 'percentage' && newPromo.value > 100) {
        toast({ variant: "destructive", title: "Invalid percentage", description: "Percentage cannot exceed 100%" });
        return;
      }
    }

    // Validation for BOGO
    if (newPromo.type === 'buy_x_get_y') {
      if (!newPromo.buyItemId || !newPromo.getItemId) {
        toast({ 
          variant: "destructive", 
          title: "Missing items", 
          description: "Please select both buy and get items for BOGO promotion" 
        });
        return;
      }
      if (newPromo.buyQuantity < 1 || newPromo.getQuantity < 1) {
        toast({ 
          variant: "destructive", 
          title: "Invalid quantities", 
          description: "Quantities must be at least 1" 
        });
        return;
      }
    }

    // Transform frontend format to backend format
    const createData = {
      name: trimmedName,
      description: null,
      promoCode: trimmedCode,
      promoType: newPromo.type,
      discountValue: (newPromo.type === 'free_delivery' || newPromo.type === 'buy_x_get_y') ? '0' : newPromo.value.toString(),
      scope: 'order',
      redemptionLimit: newPromo.maxUses,
      isActive: newPromo.isActive,
      startsAt: newPromo.startsAt ? new Date(newPromo.startsAt) : new Date(),
      endsAt: newPromo.expiresAt ? new Date(newPromo.expiresAt) : null,
      buyItemId: newPromo.buyItemId,
      getItemId: newPromo.getItemId,
      buyQuantity: newPromo.buyQuantity,
      getQuantity: newPromo.getQuantity,
      autoApply: false,
      perCustomerLimit: 1,
      priority: 0,
    };

    createPromoMutation.mutate(createData);
  };

  const handleCancelNewPromo = () => {
    setCreateDialogOpen(false);
  };

  const renderPromoDiscount = (promo: Promo) => {
    switch (promo.type) {
      case 'percentage':
        return `${promo.value}%`;
      case 'fixed':
      case 'fixed_amount':
        return `$${promo.value.toFixed(2)}`;
      case 'free_delivery':
        return 'Free Shipping';
      case 'buy_x_get_y':
        return (
          <span className="text-xs">
            Buy {promo.buyQuantity} {getMenuItemName(promo.buyItemId)} get {promo.getQuantity} {getMenuItemName(promo.getItemId)} free
          </span>
        );
      default:
        return '-';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading promos...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Smart Promos</h1>
          <p className="text-muted-foreground mt-1">
            Create auto-discount rules including Buy X Get Y Free promotions
          </p>
        </div>
        <Button onClick={handleOpenCreateDialog} data-testid="button-create-promo">
          <Plus className="h-4 w-4 mr-2" />
          Create Promo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-active-promos">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Promos</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-count">{activePromos}</div>
            <p className="text-xs text-muted-foreground">Promotional codes active</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-redemptions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-redemptions-count">{totalRedemptions}</div>
            <p className="text-xs text-muted-foreground">Promo codes used</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-promos">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Promos</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-count">{promos.length}</div>
            <p className="text-xs text-muted-foreground">Promotional codes created</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Promotional Codes</CardTitle>
          <CardDescription>Manage discount codes and auto-apply rules</CardDescription>
        </CardHeader>
        <CardContent>
          {promos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No promo codes created yet. Click "Create Promo" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Redemptions</TableHead>
                  <TableHead>Max Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promos.map((promo) => (
                  <TableRow key={promo.id} data-testid={`row-promo-${promo.id}`}>
                    <TableCell className="font-medium" data-testid={`text-code-${promo.id}`}>{promo.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-type-${promo.id}`}>
                        {promo.type === 'percentage' ? 'Percentage' :
                         promo.type === 'fixed_amount' ? 'Fixed Amount' :
                         promo.type === 'free_delivery' ? 'Free Shipping' :
                         promo.type === 'buy_x_get_y' ? 'Buy X Get Y' :
                         promo.type}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-discount-${promo.id}`}>{renderPromoDiscount(promo)}</TableCell>
                    <TableCell data-testid={`text-redemptions-${promo.id}`}>{promo.redemptions}</TableCell>
                    <TableCell data-testid={`text-maxuses-${promo.id}`}>{promo.maxUses || '∞'}</TableCell>
                    <TableCell data-testid={`text-expires-${promo.id}`}>
                      {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={promo.isActive ? "default" : "secondary"} data-testid={`badge-status-${promo.id}`}>
                        {promo.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditClick(promo)}
                        data-testid={`button-edit-${promo.id}`}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete promo code "${promo.code}"?`)) {
                            deletePromoMutation.mutate(promo.id);
                          }
                        }}
                        data-testid={`button-delete-${promo.id}`}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-promo">
          <DialogHeader>
            <DialogTitle>Edit Promo Code</DialogTitle>
            <DialogDescription>Update the promo code details</DialogDescription>
          </DialogHeader>
          {editingPromo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Promo Name</Label>
                  <Input
                    id="edit-name"
                    value={editingPromo.name || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, name: e.target.value })}
                    placeholder="e.g., Welcome Discount"
                    data-testid="input-edit-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Promo Code</Label>
                  <Input
                    id="edit-code"
                    value={editingPromo.code}
                    onChange={(e) => setEditingPromo({ ...editingPromo, code: e.target.value.toUpperCase() })}
                    placeholder="SAVE20"
                    data-testid="input-edit-code"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select
                    value={editingPromo.type}
                    onValueChange={(value) => setEditingPromo({ ...editingPromo, type: value })}
                  >
                    <SelectTrigger id="edit-type" data-testid="select-edit-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage Discount</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount Discount</SelectItem>
                      <SelectItem value="free_delivery">Free Shipping</SelectItem>
                      <SelectItem value="buy_x_get_y">Buy X Get Y Free</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editingPromo.type !== 'free_delivery' && editingPromo.type !== 'buy_x_get_y' && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-value">
                      {editingPromo.type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                    </Label>
                    <Input
                      id="edit-value"
                      type="number"
                      min="0"
                      max={editingPromo.type === 'percentage' ? 100 : undefined}
                      value={editingPromo.value}
                      onChange={(e) => setEditingPromo({ ...editingPromo, value: parseFloat(e.target.value) || 0 })}
                      data-testid="input-edit-value"
                    />
                  </div>
                )}
              </div>

              {editingPromo.type === 'buy_x_get_y' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-buy-item">Buy Item</Label>
                    <Select
                      value={editingPromo.buyItemId || ''}
                      onValueChange={(value) => setEditingPromo({ ...editingPromo, buyItemId: value })}
                    >
                      <SelectTrigger id="edit-buy-item" data-testid="select-edit-buy-item">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {menuItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-buy-quantity">Buy Quantity</Label>
                    <Input
                      id="edit-buy-quantity"
                      type="number"
                      min="1"
                      value={editingPromo.buyQuantity || 1}
                      onChange={(e) => setEditingPromo({ ...editingPromo, buyQuantity: parseInt(e.target.value) || 1 })}
                      data-testid="input-edit-buy-quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-get-item">Get Item (Free)</Label>
                    <Select
                      value={editingPromo.getItemId || ''}
                      onValueChange={(value) => setEditingPromo({ ...editingPromo, getItemId: value })}
                    >
                      <SelectTrigger id="edit-get-item" data-testid="select-edit-get-item">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {menuItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-get-quantity">Get Quantity (Free)</Label>
                    <Input
                      id="edit-get-quantity"
                      type="number"
                      min="1"
                      value={editingPromo.getQuantity || 1}
                      onChange={(e) => setEditingPromo({ ...editingPromo, getQuantity: parseInt(e.target.value) || 1 })}
                      data-testid="input-edit-get-quantity"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-max-uses">Max Uses (optional)</Label>
                  <Input
                    id="edit-max-uses"
                    type="number"
                    min="0"
                    value={editingPromo.maxUses || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, maxUses: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Unlimited"
                    data-testid="input-edit-max-uses"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expires-at">Expires At (optional)</Label>
                  <Input
                    id="edit-expires-at"
                    type="date"
                    value={editingPromo.expiresAt || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, expiresAt: e.target.value || null })}
                    data-testid="input-edit-expires-at"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={editingPromo.isActive}
                  onCheckedChange={(checked) => setEditingPromo({ ...editingPromo, isActive: checked })}
                  data-testid="switch-edit-active"
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updatePromoMutation.isPending} data-testid="button-save-edit">
              {updatePromoMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-create-promo">
          <DialogHeader>
            <DialogTitle>Create Promo Code</DialogTitle>
            <DialogDescription>Create a new promotional discount code or Buy X Get Y Free rule</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Promo Name</Label>
                <Input
                  id="new-name"
                  value={newPromo.name}
                  onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })}
                  placeholder="e.g., Welcome Discount"
                  data-testid="input-new-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-code">Promo Code</Label>
                <Input
                  id="new-code"
                  value={newPromo.code}
                  onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  data-testid="input-new-code"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-type">Type</Label>
                <Select
                  value={newPromo.type}
                  onValueChange={(value) => setNewPromo({ ...newPromo, type: value })}
                >
                  <SelectTrigger id="new-type" data-testid="select-new-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Discount</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount Discount</SelectItem>
                    <SelectItem value="free_delivery">Free Shipping</SelectItem>
                    <SelectItem value="buy_x_get_y">Buy X Get Y Free</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newPromo.type !== 'free_delivery' && newPromo.type !== 'buy_x_get_y' && (
                <div className="space-y-2">
                  <Label htmlFor="new-value">
                    {newPromo.type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                  </Label>
                  <Input
                    id="new-value"
                    type="number"
                    min="0"
                    max={newPromo.type === 'percentage' ? 100 : undefined}
                    value={newPromo.value}
                    onChange={(e) => setNewPromo({ ...newPromo, value: parseFloat(e.target.value) || 0 })}
                    data-testid="input-new-value"
                  />
                </div>
              )}
            </div>

            {newPromo.type === 'buy_x_get_y' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-buy-item">Buy Item</Label>
                  <Select
                    value={newPromo.buyItemId || ''}
                    onValueChange={(value) => setNewPromo({ ...newPromo, buyItemId: value })}
                  >
                    <SelectTrigger id="new-buy-item" data-testid="select-new-buy-item">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-buy-quantity">Buy Quantity</Label>
                  <Input
                    id="new-buy-quantity"
                    type="number"
                    min="1"
                    value={newPromo.buyQuantity}
                    onChange={(e) => setNewPromo({ ...newPromo, buyQuantity: parseInt(e.target.value) || 1 })}
                    data-testid="input-new-buy-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-get-item">Get Item (Free)</Label>
                  <Select
                    value={newPromo.getItemId || ''}
                    onValueChange={(value) => setNewPromo({ ...newPromo, getItemId: value })}
                  >
                    <SelectTrigger id="new-get-item" data-testid="select-new-get-item">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-get-quantity">Get Quantity (Free)</Label>
                  <Input
                    id="new-get-quantity"
                    type="number"
                    min="1"
                    value={newPromo.getQuantity}
                    onChange={(e) => setNewPromo({ ...newPromo, getQuantity: parseInt(e.target.value) || 1 })}
                    data-testid="input-new-get-quantity"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-max-uses">Max Uses (optional)</Label>
                <Input
                  id="new-max-uses"
                  type="number"
                  min="0"
                  value={newPromo.maxUses || ''}
                  onChange={(e) => setNewPromo({ ...newPromo, maxUses: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                  data-testid="input-new-max-uses"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-expires-at">Expires At (optional)</Label>
                <Input
                  id="new-expires-at"
                  type="date"
                  value={newPromo.expiresAt || ''}
                  onChange={(e) => setNewPromo({ ...newPromo, expiresAt: e.target.value || null })}
                  data-testid="input-new-expires-at"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="new-active"
                checked={newPromo.isActive}
                onCheckedChange={(checked) => setNewPromo({ ...newPromo, isActive: checked })}
                data-testid="switch-new-active"
              />
              <Label htmlFor="new-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelNewPromo} data-testid="button-cancel-new">
              Cancel
            </Button>
            <Button onClick={handleSaveNewPromo} disabled={createPromoMutation.isPending} data-testid="button-save-new">
              {createPromoMutation.isPending ? 'Creating...' : 'Create Promo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
