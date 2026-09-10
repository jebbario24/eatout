import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Inventory } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, AlertTriangle, Package, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/authUtils";

const inventorySchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.string().min(1, "Quantity is required"),
  unit: z.string().min(1, "Unit is required"),
  lowStockThreshold: z.string().optional(),
});

export default function Inventory() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInventory, setEditingInventory] = useState<Inventory | null>(null);

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

  const { data: inventory, isLoading } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
  });

  const form = useForm({
    resolver: zodResolver(inventorySchema),
    defaultValues: { itemName: "", quantity: "", unit: "", lowStockThreshold: "10" },
  });

  useEffect(() => {
    if (editingInventory) {
      form.reset({
        itemName: editingInventory.itemName,
        quantity: String(editingInventory.quantity),
        unit: editingInventory.unit,
        lowStockThreshold: String(editingInventory.lowStockThreshold || 10),
      });
      setDialogOpen(true);
    }
  }, [editingInventory, form]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof inventorySchema>) => {
      return await apiRequest("/api/inventory", "POST", {
        ...data,
        quantity: parseInt(data.quantity),
        lowStockThreshold: data.lowStockThreshold ? parseInt(data.lowStockThreshold) : 10,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Inventory item added successfully" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/login", 500);
        return;
      }
      toast({ title: "Failed to add inventory item", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof inventorySchema> }) => {
      return await apiRequest(`/api/inventory/${id}`, "PUT", {
        ...data,
        quantity: parseInt(data.quantity),
        lowStockThreshold: data.lowStockThreshold ? parseInt(data.lowStockThreshold) : 10,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Inventory item updated successfully" });
      setDialogOpen(false);
      setEditingInventory(null);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/login", 500);
        return;
      }
      toast({ title: "Failed to update inventory item", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/inventory/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Inventory item deleted successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/login", 500);
        return;
      }
      toast({ title: "Failed to delete inventory item", variant: "destructive" });
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const lowStockItems = inventory?.filter((item) => item.quantity <= (item.lowStockThreshold || 10));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">Track stock levels and supplies</p>
        </div>
        <Dialog 
          open={dialogOpen} 
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingInventory(null);
              form.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-add-inventory">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingInventory ? "Edit Inventory Item" : "New Inventory Item"}</DialogTitle>
              <DialogDescription>
                {editingInventory ? "Update inventory item information" : "Add a new item to inventory"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => {
                if (editingInventory) {
                  updateMutation.mutate({ id: editingInventory.id, data });
                } else {
                  createMutation.mutate(data);
                }
              })} className="space-y-4">
                <FormField
                  control={form.control}
                  name="itemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-item-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-quantity" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="kg, lbs, pcs" data-testid="input-unit" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="lowStockThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Low Stock Alert Threshold</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-threshold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending} 
                    data-testid="button-save-inventory"
                  >
                    {editingInventory 
                      ? (updateMutation.isPending ? "Updating..." : "Update Item")
                      : (createMutation.isPending ? "Adding..." : "Add Item")
                    }
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {lowStockItems && lowStockItems.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                  <p className="font-medium">{item.itemName}</p>
                  <Badge variant="destructive">
                    {item.quantity} {item.unit} remaining
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Items</CardTitle>
        </CardHeader>
        <CardContent>
          {inventory && inventory.length > 0 ? (
            <div className="space-y-3">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover-elevate group relative"
                  data-testid={`inventory-${item.id}`}
                >
                  <div className="flex items-center gap-4">
                    <Package className="h-10 w-10 text-primary" />
                    <div>
                      <p className="font-semibold">{item.itemName}</p>
                      <p className="text-sm text-muted-foreground">
                        Low stock alert at: {item.lowStockThreshold || 10} {item.unit}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {item.quantity} <span className="text-sm text-muted-foreground">{item.unit}</span>
                      </p>
                      {item.quantity <= (item.lowStockThreshold || 10) ? (
                        <Badge variant="destructive" className="mt-1">Low Stock</Badge>
                      ) : (
                        <Badge variant="default" className="mt-1">In Stock</Badge>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingInventory(item)}
                        data-testid={`button-edit-inventory-${item.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-inventory-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No inventory items yet</p>
              <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-inventory">
                <Plus className="mr-2 h-4 w-4" />
                Add First Item
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
