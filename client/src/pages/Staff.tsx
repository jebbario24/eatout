import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Staff, Merchant } from "@shared/schema";
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
import { Plus, UserCheck, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/authUtils";

const staffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.string().min(1, "Role is required"),
});

export default function Staff() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const { data: staff, isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchants/me"],
  });
  const rolePlaceholders: Record<string, string> = {
    grocery: "e.g., Cashier, Stock Clerk, Manager",
    pharmacy: "e.g., Pharmacist, Technician, Manager",
    flowers: "e.g., Florist, Delivery, Manager",
    retail: "e.g., Sales Associate, Cashier, Manager",
  };
  const rolePlaceholder = rolePlaceholders[merchant?.businessType || "retail"] || rolePlaceholders.retail;

  const form = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: "", email: "", phone: "", role: "" },
  });

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

  useEffect(() => {
    if (editingStaff) {
      form.reset({
        name: editingStaff.name,
        email: editingStaff.email || "",
        phone: editingStaff.phone || "",
        role: editingStaff.role,
      });
      setDialogOpen(true);
    }
  }, [editingStaff, form]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof staffSchema>) => {
      return await apiRequest("/api/staff", "POST", {
        ...data,
        email: data.email || null,
        phone: data.phone || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff member added successfully" });
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
      toast({ title: "Failed to add staff member", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof staffSchema> }) => {
      return await apiRequest(`/api/staff/${id}`, "PUT", {
        ...data,
        email: data.email || null,
        phone: data.phone || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff member updated successfully" });
      setDialogOpen(false);
      setEditingStaff(null);
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
      toast({ title: "Failed to update staff member", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/staff/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff member deleted successfully" });
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
      toast({ title: "Failed to delete staff member", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest(`/api/staff/${id}`, "PUT", { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff status updated successfully" });
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
      toast({ title: "Failed to update staff status", variant: "destructive" });
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Staff Management</h1>
          <p className="text-muted-foreground mt-1">Manage your team members</p>
        </div>
        <Dialog 
          open={dialogOpen} 
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingStaff(null);
              form.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-add-staff">
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStaff ? "Edit Staff Member" : "New Staff Member"}</DialogTitle>
              <DialogDescription>
                {editingStaff ? "Update team member information" : "Add a new team member"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form 
                onSubmit={form.handleSubmit((data) => {
                  if (editingStaff) {
                    updateMutation.mutate({ id: editingStaff.id, data });
                  } else {
                    createMutation.mutate(data);
                  }
                })} 
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-staff-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={rolePlaceholder} data-testid="input-staff-role" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-staff-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-staff-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending} 
                    data-testid="button-save-staff"
                  >
                    {editingStaff 
                      ? (updateMutation.isPending ? "Updating..." : "Update Staff")
                      : (createMutation.isPending ? "Adding..." : "Add Staff")
                    }
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {staff && staff.length > 0 ? (
            <div className="space-y-3">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover-elevate group relative"
                  data-testid={`staff-${member.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                      {(member.email || member.phone) && (
                        <p className="text-sm text-muted-foreground">
                          {member.email} {member.phone && `• ${member.phone}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActiveMutation.mutate({ id: member.id, isActive: !member.isActive })}
                      disabled={toggleActiveMutation.isPending}
                      data-testid={`button-toggle-active-${member.id}`}
                      role="switch"
                      aria-checked={member.isActive}
                      aria-label={`Toggle staff status: ${member.isActive ? 'Active' : 'Inactive'}`}
                      className={`
                        relative inline-flex items-center h-8 rounded-full w-24 transition-colors
                        ${member.isActive 
                          ? 'bg-green-500 hover:bg-green-600' 
                          : 'bg-red-500 hover:bg-red-600'
                        }
                        ${toggleActiveMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <span className={`
                        absolute inset-0 flex items-center px-2 text-xs font-bold text-white uppercase
                        ${member.isActive ? 'justify-start' : 'justify-end'}
                      `}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`
                        inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform
                        ${member.isActive ? 'translate-x-16' : 'translate-x-1'}
                      `} />
                    </button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingStaff(member)}
                        data-testid={`button-edit-staff-${member.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(member.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-staff-${member.id}`}
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
              <p className="text-muted-foreground mb-4">No staff members yet</p>
              <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-staff">
                <Plus className="mr-2 h-4 w-4" />
                Add First Staff Member
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
