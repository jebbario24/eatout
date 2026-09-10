import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Table } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Users, Edit, Trash2, Copy } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/authUtils";

const tableSchema = z.object({
  tableNumber: z.string().min(1, "Table number is required"),
  category: z.string().optional(),
  capacity: z.string().min(1, "Capacity is required"),
});

export default function Tables() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

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

  const { data: tables, isLoading } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
  });

  const form = useForm({
    resolver: zodResolver(tableSchema),
    defaultValues: { tableNumber: "", category: "", capacity: "" },
  });

  useEffect(() => {
    if (editingTable) {
      form.reset({
        tableNumber: editingTable.tableNumber,
        category: editingTable.category || "",
        capacity: String(editingTable.capacity),
      });
      setDialogOpen(true);
    } else {
      form.reset({ tableNumber: "", category: "", capacity: "" });
    }
  }, [editingTable, form]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tableSchema>) => {
      return await apiRequest("/api/tables", "POST", {
        ...data,
        capacity: parseInt(data.capacity),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      toast({ title: "Table created successfully" });
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
      toast({ title: "Failed to create table", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tableSchema>) => {
      if (!editingTable) throw new Error("No table selected");
      return await apiRequest(`/api/tables/${editingTable.id}`, "PUT", {
        ...data,
        capacity: parseInt(data.capacity),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      toast({ title: "Table updated successfully" });
      setDialogOpen(false);
      setEditingTable(null);
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
      toast({ title: "Failed to update table", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tableId: string) => {
      return await apiRequest(`/api/tables/${tableId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      toast({ title: "Table deleted successfully" });
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
      toast({ title: "Failed to delete table", variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (tableId: string) => {
      return await apiRequest(`/api/tables/${tableId}/duplicate`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      toast({ title: "Table duplicated successfully" });
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
      toast({ title: "Failed to duplicate table", variant: "destructive" });
    },
  });

  const handleSubmit = (data: z.infer<typeof tableSchema>) => {
    if (editingTable) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingTable(null);
      form.reset();
    }
    setDialogOpen(open);
  };

  if (authLoading || isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Tables</h1>
          <p className="text-muted-foreground mt-1">Manage restaurant tables</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-table">
              <Plus className="mr-2 h-4 w-4" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTable ? "Edit Table" : "New Table"}</DialogTitle>
              <DialogDescription>
                {editingTable ? "Update table information" : "Add a new table to your restaurant"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="tableNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Table Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 1, A1, VIP-1" data-testid="input-table-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Interior, Exterior, VIP, 1st Floor" data-testid="input-table-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} placeholder="Number of seats" data-testid="input-table-capacity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending} 
                    data-testid="button-save-table"
                  >
                    {editingTable 
                      ? (updateMutation.isPending ? "Updating..." : "Update Table")
                      : (createMutation.isPending ? "Creating..." : "Create Table")
                    }
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {tables && tables.length > 0 ? (
        <>
          {(() => {
            const groupedTables = tables.reduce((acc, table) => {
              const category = table.category || "Uncategorized";
              if (!acc[category]) acc[category] = [];
              acc[category].push(table);
              return acc;
            }, {} as Record<string, typeof tables>);

            return Object.entries(groupedTables).map(([category, categoryTables]) => (
              <div key={category} className="space-y-4">
                <h2 className="text-xl font-semibold text-muted-foreground">{category}</h2>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {categoryTables.map((table) => (
                    <Card key={table.id} className="hover-elevate group relative" data-testid={`table-${table.id}`}>
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingTable(table)}
                            data-testid={`button-edit-table-${table.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => duplicateMutation.mutate(table.id)}
                            disabled={duplicateMutation.isPending}
                            data-testid={`button-duplicate-table-${table.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(table.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-table-${table.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                          <Users className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold mb-1">Table {table.tableNumber}</h3>
                        <p className="text-sm text-muted-foreground">
                          Capacity: {table.capacity} {table.capacity === 1 ? "person" : "people"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ));
          })()}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No tables yet</p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-table">
              <Plus className="mr-2 h-4 w-4" />
              Add First Table
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
