import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, ShoppingCart, Zap } from "lucide-react";
import type { MenuItem, Merchant } from "@shared/schema";
import { getBusinessTypeConfig } from "@/lib/businessType";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Skeleton } from "@/components/ui/skeleton";

interface UpsellRule {
  id: string;
  name: string;
  triggerItemId: string | null;
  suggestionItemIds: string[];
  isActive: boolean;
}

interface RuleFormState {
  name: string;
  triggerItemId: string;
  suggestionItemId: string;
  isActive: boolean;
}

const emptyForm: RuleFormState = { name: "", triggerItemId: "", suggestionItemId: "", isActive: true };

export default function Upsells() {
  const { toast } = useToast();

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/items"],
  });

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchants/me"],
  });
  const businessConfig = getBusinessTypeConfig(merchant?.businessType);

  const { data: upsellRules = [], isLoading } = useQuery<UpsellRule[]>({
    queryKey: ["/api/upsells"],
  });

  const [editRuleDialogOpen, setEditRuleDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RuleFormState>(emptyForm);

  const [createRuleDialogOpen, setCreateRuleDialogOpen] = useState(false);
  const [newForm, setNewForm] = useState<RuleFormState>(emptyForm);

  const getMenuItemName = (itemId: string | null | undefined) => {
    if (!itemId) return `Any ${businessConfig.item.toLowerCase()}`;
    return menuItems.find((item) => item.id === itemId)?.name || `Unknown ${businessConfig.item.toLowerCase()}`;
  };

  const activeRules = upsellRules.filter((r) => r.isActive).length;

  const handleMutationError = (error: Error, fallbackTitle: string) => {
    if (isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => (window.location.href = "/login"), 500);
      return;
    }
    toast({ title: fallbackTitle, variant: "destructive" });
  };

  const createMutation = useMutation({
    mutationFn: async (data: RuleFormState) => apiRequest("/api/upsells", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/upsells"] });
      setCreateRuleDialogOpen(false);
      toast({ title: "Upsell rule created successfully" });
    },
    onError: (error: Error) => handleMutationError(error, "Failed to create upsell rule"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RuleFormState }) =>
      apiRequest(`/api/upsells/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/upsells"] });
      setEditRuleDialogOpen(false);
      toast({ title: "Upsell rule updated successfully" });
    },
    onError: (error: Error) => handleMutationError(error, "Failed to update upsell rule"),
  });

  const validate = (form: RuleFormState) => {
    if (!form.name.trim()) {
      toast({ title: "Validation Error", description: "Rule name is required", variant: "destructive" });
      return false;
    }
    if (!form.triggerItemId) {
      toast({ title: "Validation Error", description: "Trigger item is required", variant: "destructive" });
      return false;
    }
    if (!form.suggestionItemId) {
      toast({ title: "Validation Error", description: "Suggested item is required", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleEditRule = (rule: UpsellRule) => {
    setEditingRuleId(rule.id);
    setEditForm({
      name: rule.name,
      triggerItemId: rule.triggerItemId || "",
      suggestionItemId: rule.suggestionItemIds?.[0] || "",
      isActive: rule.isActive,
    });
    setEditRuleDialogOpen(true);
  };

  const handleSaveRuleEdit = () => {
    if (!editingRuleId || !validate(editForm)) return;
    updateMutation.mutate({ id: editingRuleId, data: editForm });
  };

  const handleOpenCreateRule = () => {
    setNewForm(emptyForm);
    setCreateRuleDialogOpen(true);
  };

  const handleSaveNewRule = () => {
    if (!validate(newForm)) return;
    createMutation.mutate(newForm);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Upsells & Cross-Sells</h1>
          <p className="text-muted-foreground mt-1">
            Smart add-to-cart suggestions and cross-sell rules
          </p>
        </div>
        <Button onClick={handleOpenCreateRule} data-testid="button-create-upsell">
          <Plus className="h-4 w-4 mr-2" />
          Create Rule
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-rules">
              {activeRules}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently suggesting to customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-rules">
              {upsellRules.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active and inactive combined</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upsell Rules</CardTitle>
          <CardDescription>Configure smart suggestions based on cart items</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : upsellRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No upsell rules yet — suggest a {businessConfig.item.toLowerCase()} to customers when they add another one to their cart
              </p>
              <Button onClick={handleOpenCreateRule} data-testid="button-create-first-upsell">
                <Plus className="mr-2 h-4 w-4" />
                Create First Rule
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Trigger Item</TableHead>
                  <TableHead>Suggested Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upsellRules.map((rule) => (
                  <TableRow key={rule.id} data-testid={`upsell-rule-${rule.id}`}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>{getMenuItemName(rule.triggerItemId)}</TableCell>
                    <TableCell>{getMenuItemName(rule.suggestionItemIds?.[0])}</TableCell>
                    <TableCell>
                      {rule.isActive ? (
                        <Badge className="bg-primary text-primary-foreground">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditRule(rule)}
                        data-testid={`button-edit-rule-${rule.id}`}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Rule Dialog */}
      <Dialog open={editRuleDialogOpen} onOpenChange={setEditRuleDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-edit-rule">
          <DialogHeader>
            <DialogTitle>Edit Upsell Rule</DialogTitle>
            <DialogDescription>Update the upsell rule settings below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-rule-name">Rule Name</Label>
              <Input
                id="edit-rule-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Add Drink with Burger"
                data-testid="input-edit-rule-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-rule-trigger">Trigger Item</Label>
              <Select
                value={editForm.triggerItemId}
                onValueChange={(value) => setEditForm({ ...editForm, triggerItemId: value })}
              >
                <SelectTrigger id="edit-rule-trigger" data-testid="select-edit-rule-trigger">
                  <SelectValue placeholder={`Select a ${businessConfig.item.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {menuItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">When this item is added to cart</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-rule-suggestion">Suggested Item</Label>
              <Select
                value={editForm.suggestionItemId}
                onValueChange={(value) => setEditForm({ ...editForm, suggestionItemId: value })}
              >
                <SelectTrigger id="edit-rule-suggestion" data-testid="select-edit-rule-suggestion">
                  <SelectValue placeholder={`Select a ${businessConfig.item.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {menuItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Suggest this item to the customer</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="edit-rule-active">Active</Label>
                <p className="text-xs text-muted-foreground">Enable or disable this rule</p>
              </div>
              <Switch
                id="edit-rule-active"
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                data-testid="switch-edit-rule-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRuleDialogOpen(false)} data-testid="button-cancel-rule-edit">
              Cancel
            </Button>
            <Button onClick={handleSaveRuleEdit} disabled={updateMutation.isPending} data-testid="button-save-rule-edit">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Rule Dialog */}
      <Dialog open={createRuleDialogOpen} onOpenChange={setCreateRuleDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-create-rule">
          <DialogHeader>
            <DialogTitle>Create Upsell Rule</DialogTitle>
            <DialogDescription>Set up a new smart suggestion for your customers</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-rule-name">Rule Name</Label>
              <Input
                id="new-rule-name"
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="Add Drink with Burger"
                data-testid="input-new-rule-name"
              />
              <p className="text-xs text-muted-foreground">A descriptive name for this upsell rule</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-rule-trigger">Trigger Item</Label>
              <Select
                value={newForm.triggerItemId}
                onValueChange={(value) => setNewForm({ ...newForm, triggerItemId: value })}
              >
                <SelectTrigger id="new-rule-trigger" data-testid="select-new-rule-trigger">
                  <SelectValue placeholder={`Select a ${businessConfig.item.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {menuItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">When this item is added to cart</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-rule-suggestion">Suggested Item</Label>
              <Select
                value={newForm.suggestionItemId}
                onValueChange={(value) => setNewForm({ ...newForm, suggestionItemId: value })}
              >
                <SelectTrigger id="new-rule-suggestion" data-testid="select-new-rule-suggestion">
                  <SelectValue placeholder={`Select a ${businessConfig.item.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {menuItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Suggest this item to the customer</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="new-rule-active">Start Active</Label>
                <p className="text-xs text-muted-foreground">Begin suggesting immediately when created</p>
              </div>
              <Switch
                id="new-rule-active"
                checked={newForm.isActive}
                onCheckedChange={(checked) => setNewForm({ ...newForm, isActive: checked })}
                data-testid="switch-new-rule-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRuleDialogOpen(false)} data-testid="button-cancel-new-rule">
              Cancel
            </Button>
            <Button onClick={handleSaveNewRule} disabled={createMutation.isPending} data-testid="button-save-new-rule">
              {createMutation.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
