import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, DollarSign, TrendingUp, X, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MenuItem, Restaurant } from "@shared/schema";
import { getBusinessTypeConfig } from "@/lib/businessType";
import { InlineImageUploader } from "@/components/InlineImageUploader";
import type { UploadResult } from "@uppy/core";

interface Bundle {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  items: string[];
  regularPrice: number;
  bundlePrice: number;
  sales: number;
  isActive: boolean;
}

export default function Bundles() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Fetch restaurant data for currency
  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants/me"],
  });
  const businessConfig = getBusinessTypeConfig(restaurant?.businessType);
  const bundleNamePlaceholders: Record<string, string> = {
    restaurant: "Family Meal Deal",
    grocery: "Weekly Essentials Bundle",
    pharmacy: "Cold & Flu Care Pack",
    flowers: "Anniversary Bouquet Bundle",
    retail: "Starter Bundle",
  };
  const bundleNamePlaceholder = bundleNamePlaceholders[restaurant?.businessType || "restaurant"] || bundleNamePlaceholders.restaurant;

  // Fetch available menu items
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/items"],
  });

  // Filter only available menu items
  const availableMenuItems = menuItems.filter(item => item.isAvailable);

  // Fetch bundles from database
  const { data: bundles = [], isLoading: bundlesLoading } = useQuery<Bundle[]>({
    queryKey: ["/api/bundles"],
  });

  // Create bundle mutation
  const createBundleMutation = useMutation({
    mutationFn: async (bundle: any) => {
      return await apiRequest("/api/bundles", "POST", bundle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bundles"] });
      toast({
        title: "Success",
        description: "Bundle created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create bundle",
        variant: "destructive",
      });
    },
  });

  // Update bundle mutation
  const updateBundleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/bundles/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bundles"] });
      toast({
        title: "Success",
        description: "Bundle updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update bundle",
        variant: "destructive",
      });
    },
  });

  // Delete bundle mutation
  const deleteBundleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/bundles/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bundles"] });
      toast({
        title: "Success",
        description: "Bundle deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete bundle",
        variant: "destructive",
      });
    },
  });

  // Dialog states
  const [editBundleDialogOpen, setEditBundleDialogOpen] = useState(false);
  const [createBundleDialogOpen, setCreateBundleDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bundleToDelete, setBundleToDelete] = useState<Bundle | null>(null);

  // Editing states
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [bundleInputs, setBundleInputs] = useState({ regularPrice: '', bundlePrice: '', sales: '' });
  const [bundleItems, setBundleItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');

  // New bundle state
  const [newBundle, setNewBundle] = useState<Bundle>({
    id: '',
    name: '',
    description: '',
    imageUrl: '',
    items: [],
    regularPrice: 0,
    bundlePrice: 0,
    sales: 0,
    isActive: true,
  });
  const [newBundleInputs, setNewBundleInputs] = useState({ regularPrice: '', bundlePrice: '', sales: '' });
  const [newBundleItems, setNewBundleItems] = useState<string[]>([]);
  const [newBundleNewItem, setNewBundleNewItem] = useState('');

  // Calculated stats
  const activeBundles = bundles.filter(b => b.isActive).length;
  const totalSales = bundles.reduce((sum, b) => sum + b.sales, 0);
  const avgDiscount = bundles.length > 0
    ? bundles.reduce((sum, b) => sum + ((b.regularPrice - b.bundlePrice) / b.regularPrice * 100), 0) / bundles.length
    : 0;

  // Currency formatter
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const currency = restaurant?.currency || 'USD';
    const country = restaurant?.country || 'United States';
    
    // Map countries to locale codes
    const localeMap: { [key: string]: string } = {
      'United States': 'en-US',
      'Canada': 'en-CA',
      'United Kingdom': 'en-GB',
      'Morocco': 'ar-MA',
      'France': 'fr-FR',
      'Germany': 'de-DE',
      'Spain': 'es-ES',
      'Italy': 'it-IT',
      'UAE': 'ar-AE',
      'Saudi Arabia': 'ar-SA',
      'Egypt': 'ar-EG',
      'India': 'en-IN',
      'China': 'zh-CN',
      'Japan': 'ja-JP',
      'Australia': 'en-AU',
    };
    
    const locale = localeMap[country] || 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(numAmount);
  };

  // Image upload handlers
  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      credentials: "include",
    });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
      objectPath: data.objectPath,
    };
  };

  const handleEditImageComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const file = result.successful[0];
      const objectPath = file.meta?.objectPath as string;
      if (objectPath && editingBundle) {
        setEditingBundle({ ...editingBundle, imageUrl: objectPath });
        toast({ title: "Success", description: "Image uploaded successfully" });
      }
    }
  };

  const handleNewImageComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const file = result.successful[0];
      const objectPath = file.meta?.objectPath as string;
      if (objectPath) {
        setNewBundle({ ...newBundle, imageUrl: objectPath });
        toast({ title: "Success", description: "Image uploaded successfully" });
      }
    }
  };

  // Edit Bundle handlers
  const handleEditBundle = (bundle: Bundle) => {
    setEditingBundle({ ...bundle });
    setBundleInputs({
      regularPrice: bundle.regularPrice.toString(),
      bundlePrice: bundle.bundlePrice.toString(),
      sales: bundle.sales.toString(),
    });
    setBundleItems([...bundle.items]);
    setNewItem('');
    setEditBundleDialogOpen(true);
  };

  const handleAddItem = () => {
    if (newItem.trim()) {
      setBundleItems([...bundleItems, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setBundleItems(bundleItems.filter((_, i) => i !== index));
  };

  const handleSaveBundle = () => {
    if (!editingBundle) return;

    // Validate
    if (!editingBundle.name.trim()) {
      toast({ variant: "destructive", title: "Invalid bundle name", description: "Bundle name is required" });
      return;
    }

    // Filter out empty items and validate
    const validItems = bundleItems.filter(item => item.trim() !== '');
    if (validItems.length === 0) {
      toast({ variant: "destructive", title: "Invalid items", description: "At least one non-empty item is required" });
      return;
    }

    const regularPrice = parseFloat(bundleInputs.regularPrice);
    const bundlePrice = parseFloat(bundleInputs.bundlePrice);
    const sales = parseInt(bundleInputs.sales);

    if (isNaN(regularPrice) || regularPrice <= 0) {
      toast({ variant: "destructive", title: "Invalid regular price", description: "Must be a number > 0" });
      return;
    }
    if (isNaN(bundlePrice) || bundlePrice <= 0) {
      toast({ variant: "destructive", title: "Invalid bundle price", description: "Must be a number > 0" });
      return;
    }
    if (bundlePrice >= regularPrice) {
      toast({ variant: "destructive", title: "Invalid pricing", description: "Bundle price must be less than regular price" });
      return;
    }
    if (isNaN(sales) || sales < 0) {
      toast({ variant: "destructive", title: "Invalid sales", description: "Must be a number >= 0" });
      return;
    }

    updateBundleMutation.mutate({
      id: editingBundle.id,
      data: {
        name: editingBundle.name,
        imageUrl: editingBundle.imageUrl || '',
        items: validItems,
        regularPrice,
        bundlePrice,
        sales,
        isActive: editingBundle.isActive,
      },
    });

    setEditBundleDialogOpen(false);
  };

  const handleCancelBundleEdit = () => {
    setEditBundleDialogOpen(false);
    setEditingBundle(null);
    setBundleItems([]);
  };

  // Create Bundle handlers
  const handleOpenCreateBundle = () => {
    setNewBundle({
      id: '',
      name: '',
      items: [],
      regularPrice: 0,
      bundlePrice: 0,
      sales: 0,
      isActive: true,
    });
    setNewBundleInputs({ regularPrice: '', bundlePrice: '', sales: '0' });
    setNewBundleItems([]);
    setNewBundleNewItem('');
    setCreateBundleDialogOpen(true);
  };

  const handleAddNewBundleItem = () => {
    if (newBundleNewItem.trim()) {
      setNewBundleItems([...newBundleItems, newBundleNewItem.trim()]);
      setNewBundleNewItem('');
    }
  };

  const handleRemoveNewBundleItem = (index: number) => {
    setNewBundleItems(newBundleItems.filter((_, i) => i !== index));
  };

  const handleSaveNewBundle = () => {
    // Validate
    if (!newBundle.name.trim()) {
      toast({ variant: "destructive", title: "Invalid bundle name", description: "Bundle name is required" });
      return;
    }

    // Filter out empty items and validate
    const validItems = newBundleItems.filter(item => item.trim() !== '');
    if (validItems.length === 0) {
      toast({ variant: "destructive", title: "Invalid items", description: "At least one non-empty item is required" });
      return;
    }

    const regularPrice = parseFloat(newBundleInputs.regularPrice);
    const bundlePrice = parseFloat(newBundleInputs.bundlePrice);
    const sales = parseInt(newBundleInputs.sales);

    if (isNaN(regularPrice) || regularPrice <= 0) {
      toast({ variant: "destructive", title: "Invalid regular price", description: "Must be a number > 0" });
      return;
    }
    if (isNaN(bundlePrice) || bundlePrice <= 0) {
      toast({ variant: "destructive", title: "Invalid bundle price", description: "Must be a number > 0" });
      return;
    }
    if (bundlePrice >= regularPrice) {
      toast({ variant: "destructive", title: "Invalid pricing", description: "Bundle price must be less than regular price" });
      return;
    }
    if (isNaN(sales) || sales < 0) {
      toast({ variant: "destructive", title: "Invalid sales", description: "Must be a number >= 0" });
      return;
    }

    createBundleMutation.mutate({
      name: newBundle.name,
      imageUrl: newBundle.imageUrl || '',
      items: validItems,
      regularPrice,
      bundlePrice,
      sales,
      isActive: newBundle.isActive,
    });

    setCreateBundleDialogOpen(false);
  };

  const handleCancelNewBundle = () => {
    setCreateBundleDialogOpen(false);
    setNewBundleItems([]);
  };

  // Delete Bundle handlers
  const handleOpenDeleteConfirm = (bundle: Bundle) => {
    setBundleToDelete(bundle);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!bundleToDelete) return;

    deleteBundleMutation.mutate(bundleToDelete.id);
    setDeleteConfirmOpen(false);
    setBundleToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setBundleToDelete(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bundles & Combos</h1>
          <p className="text-muted-foreground mt-1">
            Create combo deals with special pricing
          </p>
        </div>
        <Button onClick={handleOpenCreateBundle} data-testid="button-create-bundle">
          <Plus className="h-4 w-4 mr-2" />
          Create Bundle
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bundles</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-bundles">
              {activeBundles}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-bundle-sales">
              {totalSales}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bundles sold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Discount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-discount">
              {avgDiscount.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Off regular price
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bundles.map((bundle) => (
          <Card key={bundle.id} data-testid={`bundle-${bundle.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{bundle.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {bundle.sales} sold
                  </CardDescription>
                </div>
                {bundle.isActive ? (
                  <Badge variant="default" className="bg-green-500">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Includes:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {bundle.items.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-between pt-3 border-t">
                <div>
                  <p className="text-xs text-muted-foreground line-through">
                    {formatCurrency(bundle.regularPrice)}
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(bundle.bundlePrice)}
                  </p>
                </div>
                <Badge variant="outline" className="text-green-600">
                  Save {formatCurrency(Number(bundle.regularPrice) - Number(bundle.bundlePrice))}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleEditBundle(bundle)}
                  data-testid={`button-edit-bundle-${bundle.id}`}
                >
                  Edit Bundle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDeleteConfirm(bundle)}
                  data-testid={`button-delete-bundle-${bundle.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Bundle Dialog */}
      <Dialog open={editBundleDialogOpen} onOpenChange={setEditBundleDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-bundle">
          <DialogHeader>
            <DialogTitle>Edit Bundle</DialogTitle>
            <DialogDescription>
              Update bundle details, items, and pricing
            </DialogDescription>
          </DialogHeader>
          {editingBundle && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bundle-name">Bundle Name</Label>
                <Input
                  id="edit-bundle-name"
                  value={editingBundle.name}
                  onChange={(e) => setEditingBundle({ ...editingBundle, name: e.target.value })}
                  placeholder={bundleNamePlaceholder}
                  data-testid="input-edit-bundle-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bundle-image">Bundle Image</Label>
                <InlineImageUploader
                  currentImageUrl={editingBundle.imageUrl}
                  maxFileSize={5242880}
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleEditImageComplete}
                  onRemove={() => setEditingBundle({ ...editingBundle, imageUrl: '' })}
                  note="Add a photo of your bundle (max 5MB, JPG or PNG)"
                />
              </div>

              <div className="space-y-2">
                <Label>Bundle Items</Label>
                <div className="space-y-2">
                  {bundleItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm">
                        {item}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveItem(index)}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Select value={newItem} onValueChange={setNewItem}>
                      <SelectTrigger className="flex-1" data-testid="select-new-item">
                        <SelectValue placeholder={`Select ${businessConfig.item.toLowerCase()} to add`} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMenuItems.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            No available menu items
                          </div>
                        ) : (
                          availableMenuItems
                            .filter(menuItem => !bundleItems.includes(menuItem.name))
                            .map((menuItem) => (
                              <SelectItem key={menuItem.id} value={menuItem.name}>
                                {menuItem.name}
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddItem} disabled={!newItem} data-testid="button-add-item">
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-regular-price">Regular Price ({restaurant?.currency || 'USD'})</Label>
                  <Input
                    id="edit-regular-price"
                    type="number"
                    value={bundleInputs.regularPrice}
                    onChange={(e) => setBundleInputs({ ...bundleInputs, regularPrice: e.target.value })}
                    placeholder="45.00"
                    min="0"
                    step="0.01"
                    data-testid="input-edit-regular-price"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-bundle-price">Bundle Price ({restaurant?.currency || 'USD'})</Label>
                  <Input
                    id="edit-bundle-price"
                    type="number"
                    value={bundleInputs.bundlePrice}
                    onChange={(e) => setBundleInputs({ ...bundleInputs, bundlePrice: e.target.value })}
                    placeholder="35.99"
                    min="0"
                    step="0.01"
                    data-testid="input-edit-bundle-price"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-sales">Sales Count</Label>
                <Input
                  id="edit-sales"
                  type="number"
                  value={bundleInputs.sales}
                  onChange={(e) => setBundleInputs({ ...bundleInputs, sales: e.target.value })}
                  placeholder="124"
                  min="0"
                  data-testid="input-edit-sales"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="edit-active">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Show this bundle to customers
                    </p>
                  </div>
                  <Switch
                    id="edit-active"
                    checked={editingBundle.isActive}
                    onCheckedChange={(checked) => setEditingBundle({ ...editingBundle, isActive: checked })}
                    data-testid="switch-edit-active"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelBundleEdit} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleSaveBundle} data-testid="button-save-edit">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Bundle Dialog */}
      <Dialog open={createBundleDialogOpen} onOpenChange={setCreateBundleDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-create-bundle">
          <DialogHeader>
            <DialogTitle>Create New Bundle</DialogTitle>
            <DialogDescription>
              Set up a new combo deal with special pricing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-bundle-name">Bundle Name</Label>
              <Input
                id="new-bundle-name"
                value={newBundle.name}
                onChange={(e) => setNewBundle({ ...newBundle, name: e.target.value })}
                placeholder={bundleNamePlaceholder}
                data-testid="input-new-bundle-name"
              />
              <p className="text-xs text-muted-foreground">
                A catchy name for your combo deal
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-bundle-image">Bundle Image</Label>
              <InlineImageUploader
                currentImageUrl={newBundle.imageUrl}
                maxFileSize={5242880}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleNewImageComplete}
                onRemove={() => setNewBundle({ ...newBundle, imageUrl: '' })}
                note="Add a photo of your bundle (max 5MB, JPG or PNG)"
              />
            </div>

            <div className="space-y-2">
              <Label>Bundle Items</Label>
              <div className="space-y-2">
                {newBundleItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm">
                      {item}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveNewBundleItem(index)}
                      data-testid={`button-remove-new-bundle-item-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Select value={newBundleNewItem} onValueChange={setNewBundleNewItem}>
                    <SelectTrigger className="flex-1" data-testid="select-new-bundle-new-item">
                      <SelectValue placeholder={`Select ${businessConfig.item.toLowerCase()} to add`} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMenuItems.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No available menu items
                        </div>
                      ) : (
                        availableMenuItems
                          .filter(menuItem => !newBundleItems.includes(menuItem.name))
                          .map((menuItem) => (
                            <SelectItem key={menuItem.id} value={menuItem.name}>
                              {menuItem.name}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddNewBundleItem} disabled={!newBundleNewItem} data-testid="button-add-new-bundle-item">
                    Add
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Add items included in this bundle
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-regular-price">Regular Price ({restaurant?.currency || 'USD'})</Label>
                <Input
                  id="new-regular-price"
                  type="number"
                  value={newBundleInputs.regularPrice}
                  onChange={(e) => setNewBundleInputs({ ...newBundleInputs, regularPrice: e.target.value })}
                  placeholder="45.00"
                  min="0"
                  step="0.01"
                  data-testid="input-new-regular-price"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-bundle-price">Bundle Price ({restaurant?.currency || 'USD'})</Label>
                <Input
                  id="new-bundle-price"
                  type="number"
                  value={newBundleInputs.bundlePrice}
                  onChange={(e) => setNewBundleInputs({ ...newBundleInputs, bundlePrice: e.target.value })}
                  placeholder="35.99"
                  min="0"
                  step="0.01"
                  data-testid="input-new-bundle-price"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-sales">Initial Sales Count</Label>
              <Input
                id="new-sales"
                type="number"
                value={newBundleInputs.sales}
                onChange={(e) => setNewBundleInputs({ ...newBundleInputs, sales: e.target.value })}
                placeholder="0"
                min="0"
                data-testid="input-new-sales"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="new-active">Start Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Make bundle available to customers immediately
                  </p>
                </div>
                <Switch
                  id="new-active"
                  checked={newBundle.isActive}
                  onCheckedChange={(checked) => setNewBundle({ ...newBundle, isActive: checked })}
                  data-testid="switch-new-active"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelNewBundle} data-testid="button-cancel-new">
              Cancel
            </Button>
            <Button onClick={handleSaveNewBundle} data-testid="button-save-new">
              Create Bundle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bundle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{bundleToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
