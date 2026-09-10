import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Reservation, Table } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Calendar, Edit, Trash2, Users, Phone, Mail, Clock, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { isUnauthorizedError } from "@/lib/authUtils";

const reservationSchema = z.object({
  tableId: z.string().optional(),
  customerName: z.string().min(1, "Name is required"),
  customerPhone: z.string().min(1, "Phone is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  partySize: z.string().min(1, "Party size is required"),
  reservationDate: z.string().min(1, "Date and time is required"),
  notes: z.string().optional(),
});

export default function Reservations() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

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

  const { data: reservations, isLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/reservations"],
  });

  const { data: tables } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
  });

  const form = useForm({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      tableId: "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      partySize: "",
      reservationDate: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (editingReservation) {
      form.reset({
        tableId: editingReservation.tableId || "",
        customerName: editingReservation.customerName,
        customerPhone: editingReservation.customerPhone,
        customerEmail: editingReservation.customerEmail || "",
        partySize: String(editingReservation.partySize),
        reservationDate: new Date(editingReservation.reservationDate).toISOString().slice(0, 16),
        notes: editingReservation.notes || "",
      });
      setDialogOpen(true);
    }
  }, [editingReservation, form]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof reservationSchema>) => {
      return await apiRequest("/api/reservations", "POST", {
        ...data,
        partySize: parseInt(data.partySize),
        tableId: data.tableId || null,
        customerEmail: data.customerEmail || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      toast({ title: "Reservation created successfully" });
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
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
      } else {
        toast({
          title: "Failed to create reservation",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof reservationSchema>) => {
      if (!editingReservation) return;
      return await apiRequest(`/api/reservations/${editingReservation.id}`, "PUT", {
        ...data,
        partySize: parseInt(data.partySize),
        tableId: data.tableId || null,
        customerEmail: data.customerEmail || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      toast({ title: "Reservation updated successfully" });
      setDialogOpen(false);
      setEditingReservation(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update reservation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/reservations/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      toast({ title: "Reservation deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete reservation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest(`/api/reservations/${id}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/reservations"] });
      toast({ title: "Reservation status updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    if (editingReservation) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  });

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingReservation(null);
      form.reset();
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'seated':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatDateTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };
  };

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reservations</h1>
          <p className="text-muted-foreground mt-1">Manage your restaurant bookings and reservations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button size="default" data-testid="button-add-reservation">
              <Plus className="mr-2 h-4 w-4" />
              New Reservation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingReservation ? "Edit Reservation" : "Create New Reservation"}
              </DialogTitle>
              <DialogDescription>
                {editingReservation 
                  ? "Update the reservation details below" 
                  : "Fill in the details to create a new reservation"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} data-testid="input-customer-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 000-0000" {...field} data-testid="input-customer-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} data-testid="input-customer-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="partySize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Party Size</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" placeholder="4" {...field} data-testid="input-party-size" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reservationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date & Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} data-testid="input-reservation-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tableId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-table">
                              <SelectValue placeholder="No specific table" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tables?.map((table) => (
                              <SelectItem key={table.id} value={table.id}>
                                Table {table.tableNumber} {table.category ? `(${table.category})` : ""} - {table.capacity} seats
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requests (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special requests or dietary requirements..."
                          className="resize-none"
                          rows={3}
                          {...field}
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending} 
                    data-testid="button-save-reservation"
                  >
                    {editingReservation 
                      ? (updateMutation.isPending ? "Updating..." : "Update Reservation")
                      : (createMutation.isPending ? "Creating..." : "Create Reservation")
                    }
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {reservations && reservations.length > 0 ? (
          reservations.map((reservation) => {
            const { date, time } = formatDateTime(reservation.reservationDate);
            const table = tables?.find(t => t.id === reservation.tableId);
            
            return (
              <Card key={reservation.id} className="group relative hover-elevate" data-testid={`reservation-${reservation.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex gap-6 flex-1">
                      {/* Date/Time Column */}
                      <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-4 min-w-[100px]">
                        <Calendar className="h-6 w-6 text-primary mb-2" />
                        <div className="text-center">
                          <p className="font-semibold text-sm">{date}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {time}
                          </p>
                        </div>
                      </div>

                      {/* Details Column */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">{reservation.customerName}</h3>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              Party of {reservation.partySize}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {reservation.customerPhone}
                            </span>
                            {reservation.customerEmail && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {reservation.customerEmail}
                              </span>
                            )}
                            {table && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                Table {table.tableNumber}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {reservation.notes && (
                          <div className="bg-muted/50 rounded-md p-3">
                            <p className="text-sm text-muted-foreground italic">"{reservation.notes}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Column */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={getStatusColor(reservation.status)} className="capitalize">
                          {reservation.status}
                        </Badge>
                        {reservation.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`confirm-${reservation.id}`} className="text-xs text-muted-foreground cursor-pointer">
                              Guest arrived?
                            </Label>
                            <Switch
                              id={`confirm-${reservation.id}`}
                              checked={false}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  toggleStatusMutation.mutate({ id: reservation.id, status: 'confirmed' });
                                }
                              }}
                              disabled={toggleStatusMutation.isPending}
                              data-testid={`switch-confirm-reservation-${reservation.id}`}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingReservation(reservation)}
                          data-testid={`button-edit-reservation-${reservation.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(reservation.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-reservation-${reservation.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-primary/10 p-6 mb-4">
                <Calendar className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No reservations yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Start managing your restaurant bookings by creating your first reservation
              </p>
              <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-reservation">
                <Plus className="mr-2 h-4 w-4" />
                Create First Reservation
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
