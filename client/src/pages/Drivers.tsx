import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  TrendingUp,
  DollarSign,
  Star,
  MapPin,
  Phone,
  Mail,
  Car,
  Copy,
  Check,
  Link2,
  RotateCw,
  Trash2,
  UserPlus,
} from "lucide-react";
import type { DriverProfile, Order } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function Drivers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [linkDialogDriverId, setLinkDialogDriverId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: drivers = [], isLoading: driversLoading } = useQuery<DriverProfile[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<(Order & { driver?: DriverProfile })[]>({
    queryKey: ["/api/driver-assignments"],
  });

  const { data: performance = [], isLoading: performanceLoading } = useQuery<Array<{
    driverId: string;
    driver: DriverProfile;
    deliveries: number;
    earnings: string;
    rating: string;
  }>>({
    queryKey: ["/api/driver-performance"],
  });

  const { data: driverLink } = useQuery<{ url: string }>({
    queryKey: [`/api/drivers/${linkDialogDriverId}/link`],
    enabled: !!linkDialogDriverId,
  });

  const addDriverForm = useForm({
    defaultValues: { firstName: "", lastName: "", phone: "", email: "", vehicleType: "", vehiclePlate: "" },
  });

  const addDriverMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/drivers", "POST", data),
    onSuccess: async (res) => {
      const driver = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      addDriverForm.reset();
      setAddDriverOpen(false);
      toast({ title: "Driver added" });
      setLinkDialogDriverId(driver.id);
    },
    onError: (error: any) => {
      toast({ title: "Failed to add driver", description: error.message, variant: "destructive" });
    },
  });

  const regenerateLinkMutation = useMutation({
    mutationFn: (driverId: string) => apiRequest(`/api/drivers/${driverId}/link/regenerate`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/${linkDialogDriverId}/link`] });
      toast({ title: "Delivery link regenerated" });
    },
  });

  const removeDriverMutation = useMutation({
    mutationFn: (driverId: string) => apiRequest(`/api/drivers/${driverId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Driver removed" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove driver", description: error.message, variant: "destructive" });
    },
  });

  const activeDrivers = drivers.filter((d) => d.isActive);

  const copyLink = () => {
    if (!driverLink?.url) return;
    navigator.clipboard.writeText(driverLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Drivers & Delivery</h1>
          <p className="text-muted-foreground mt-1">
            Manage your own delivery fleet, assignments, and performance
          </p>
        </div>

        <Dialog open={addDriverOpen} onOpenChange={setAddDriverOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-driver">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a Driver</DialogTitle>
              <DialogDescription>
                Drivers don't sign up themselves — add them here and share their personal delivery link.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={addDriverForm.handleSubmit((data) => addDriverMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" {...addDriverForm.register("firstName", { required: true })} data-testid="input-driver-first-name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" {...addDriverForm.register("lastName", { required: true })} data-testid="input-driver-last-name" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...addDriverForm.register("phone", { required: true })} data-testid="input-driver-phone" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email (optional)</Label>
                <Input id="email" type="email" {...addDriverForm.register("email")} data-testid="input-driver-email" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="vehicleType">Vehicle Type</Label>
                  <Input id="vehicleType" placeholder="Car, bike..." {...addDriverForm.register("vehicleType")} data-testid="input-driver-vehicle-type" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vehiclePlate">Plate (optional)</Label>
                  <Input id="vehiclePlate" {...addDriverForm.register("vehiclePlate")} data-testid="input-driver-vehicle-plate" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addDriverMutation.isPending} data-testid="button-submit-add-driver">
                  Add Driver
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!linkDialogDriverId} onOpenChange={(open) => !open && setLinkDialogDriverId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delivery Link</DialogTitle>
              <DialogDescription>
                Send this link to the driver. It works on their phone with no login — they use it to see and accept
                orders, update delivery status, and share their location while out on a delivery.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input readOnly value={driverLink?.url || "Loading…"} className="text-xs" data-testid="input-delivery-link" />
              <Button size="icon" variant="outline" onClick={copyLink} data-testid="button-copy-delivery-link">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => linkDialogDriverId && regenerateLinkMutation.mutate(linkDialogDriverId)}
                disabled={regenerateLinkMutation.isPending}
                data-testid="button-regenerate-link"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Regenerate Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active-drivers">Active Drivers</TabsTrigger>
          <TabsTrigger value="assignments" data-testid="tab-assignments">Assignments</TabsTrigger>
          <TabsTrigger value="zones" data-testid="tab-zones">Delivery Zones</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {driversLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : activeDrivers.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No drivers yet</p>
                  <p className="text-sm mt-2">Add your first driver to start building your delivery fleet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeDrivers.map((driver) => (
                <Card key={driver.id} data-testid={`driver-card-${driver.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {driver.firstName} {driver.lastName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          {driver.isAvailable ? (
                            <Badge variant="default" className="bg-green-500">Online</Badge>
                          ) : (
                            <Badge variant="secondary">Offline</Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{driver.phone}</span>
                    </div>
                    {driver.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{driver.email}</span>
                      </div>
                    )}
                    {driver.vehicleType && (
                      <div className="flex items-center gap-2 text-sm">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span>{driver.vehicleType} {driver.vehiclePlate && `(${driver.vehiclePlate})`}</span>
                      </div>
                    )}
                    {driver.currentLat && driver.currentLng && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {Number(driver.currentLat).toFixed(4)}, {Number(driver.currentLng).toFixed(4)}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setLinkDialogDriverId(driver.id)}
                        data-testid={`button-get-link-${driver.id}`}
                      >
                        <Link2 className="h-4 w-4 mr-1" />
                        Delivery Link
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => removeDriverMutation.mutate(driver.id)}
                        disabled={removeDriverMutation.isPending}
                        data-testid={`button-remove-driver-${driver.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          {assignmentsLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active delivery assignments</p>
                  <p className="text-sm mt-2">Delivery orders will appear here when confirmed</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Active Deliveries</CardTitle>
                <CardDescription>{assignments.length} delivery orders in progress</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Delivery Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id} data-testid={`assignment-${assignment.id}`}>
                        <TableCell className="font-medium">{assignment.orderNumber}</TableCell>
                        <TableCell>
                          {assignment.driver ?
                            `${assignment.driver.firstName} ${assignment.driver.lastName}` :
                            <span className="text-muted-foreground">Unassigned</span>
                          }
                        </TableCell>
                        <TableCell>{assignment.customerName}</TableCell>
                        <TableCell className="text-sm">
                          {assignment.deliveryCity}, {assignment.deliveryCountry}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">{assignment.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">${Number(assignment.total).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="zones" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Delivery Zones</h3>
                <p className="text-muted-foreground mb-4">
                  Manage your delivery zones in the Delivery Zones page
                </p>
                <a
                  href="/delivery-zones"
                  className="text-primary hover:underline font-medium"
                  data-testid="link-delivery-zones"
                >
                  Go to Delivery Zones →
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {performanceLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : performance.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No driver performance data yet</p>
                  <p className="text-sm mt-2">Performance metrics will show after completed deliveries</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Driver Performance</CardTitle>
                <CardDescription>Lifetime statistics for all drivers</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total Deliveries</TableHead>
                      <TableHead className="text-right">Total Earnings</TableHead>
                      <TableHead className="text-right">Avg Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performance.map((perf) => (
                      <TableRow key={perf.driverId} data-testid={`performance-${perf.driverId}`}>
                        <TableCell className="font-medium">
                          {perf.driver.firstName} {perf.driver.lastName}
                        </TableCell>
                        <TableCell>
                          {perf.driver.isAvailable ? (
                            <Badge variant="default" className="bg-green-500">Online</Badge>
                          ) : (
                            <Badge variant="secondary">Offline</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            {perf.deliveries}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            ${Number(perf.earnings).toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {perf.rating}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
