import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Order } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Store, Truck, User, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  preparing: "default",
  ready: "default",
  shipped: "default",
  completed: "outline",
  cancelled: "destructive",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled",
};

type ExtendedOrder = Order & {
  restaurantName?: string | null;
  currency?: string | null;
  deliveryInstructions?: string | null;
  discount?: string | null;
};

export default function AdminOrders() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<ExtendedOrder | null>(null);
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [restaurantFilter, setRestaurantFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // WebSocket setup for real-time order and delivery tracking
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    ws.onopen = () => {
      console.log('WebSocket connected for admin order tracking');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle new orders
        if (data.type === 'new_order') {
          queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    return () => {
      ws.close();
    };
  }, [toast]);

  const { data: orders = [], isLoading } = useQuery<ExtendedOrder[]>({
    queryKey: ["/api/admin/orders"],
  });

  // Get unique restaurant names for filter
  const uniqueRestaurants = Array.from(
    new Set(orders.map(o => o.restaurantName).filter(Boolean))
  ).sort();

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (orderTypeFilter !== "all" && order.orderType !== orderTypeFilter) return false;
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    if (restaurantFilter !== "all" && order.restaurantName !== restaurantFilter) return false;
    if (searchQuery && !order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatCurrency = (amount: string | null | undefined, currency: string = "USD") => {
    if (!amount) return "$0.00";
    const value = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-all-orders">All Orders</h1>
        <p className="text-muted-foreground">Track orders from all merchants</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by order number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-order"
              />
            </div>
            <Select value={restaurantFilter} onValueChange={setRestaurantFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-restaurant-filter">
                <SelectValue placeholder="Filter by merchant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Merchants</SelectItem>
                {uniqueRestaurants.map((name) => (
                  <SelectItem key={name} value={name!}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-order-type">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="shipping">Shipping</SelectItem>
                <SelectItem value="dine_in">Dine In</SelectItem>
                <SelectItem value="pickup">Pickup</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                      <TableCell className="font-medium" data-testid={`text-order-number-${order.id}`}>
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{order.restaurantName || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{order.customerName}</div>
                            {order.customerPhone && (
                              <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {order.orderType === "shipping" && <Truck className="h-3 w-3 mr-1" />}
                          {order.orderType?.replace("_", " ") || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[order.status] || "outline"}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(order.total, order.currency || "USD")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A"}<br />
                        {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                          data-testid={`button-view-order-${order.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Merchant
                  </h3>
                  <p className="text-sm">{selectedOrder.restaurantName || "Unknown"}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer
                  </h3>
                  <p className="text-sm">{selectedOrder.customerName}</p>
                  {selectedOrder.customerPhone && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone}</p>
                  )}
                  {selectedOrder.customerEmail && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.customerEmail}</p>
                  )}
                </div>
              </div>

              {selectedOrder.orderType === "shipping" && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Shipping Address
                  </h3>
                  <p className="text-sm">{selectedOrder.shippingAddress}</p>
                  {selectedOrder.deliveryInstructions && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Instructions: {selectedOrder.deliveryInstructions}
                    </p>
                  )}
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedOrder.subtotal, selectedOrder.currency || "USD")}</span>
                  </div>
                  {parseFloat(selectedOrder.shippingFee || "0") > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Shipping Fee:</span>
                      <span>{formatCurrency(selectedOrder.shippingFee, selectedOrder.currency || "USD")}</span>
                    </div>
                  )}
                  {parseFloat(selectedOrder.tax || "0") > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>{formatCurrency(selectedOrder.tax, selectedOrder.currency || "USD")}</span>
                    </div>
                  )}
                  {parseFloat(selectedOrder.discount || "0") > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(selectedOrder.discount, selectedOrder.currency || "USD")}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedOrder.total, selectedOrder.currency || "USD")}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Order Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={statusColors[selectedOrder.status] || "outline"} className="ml-2">
                      {statusLabels[selectedOrder.status] || selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="outline" className="ml-2">
                      {selectedOrder.orderType?.replace("_", " ") || "N/A"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment:</span>
                    <span className="ml-2 capitalize">{selectedOrder.paymentMethod?.replace("_", " ")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <span className="ml-2">{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
