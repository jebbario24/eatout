import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Order, OrderItem, MenuItem, Bundle } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, Eye, Clock, CheckCircle, XCircle, ChefHat, Printer, Trash2, Download, FileText, RotateCcw, Pencil, CheckCheck, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DraftBuilderDialog,
  FinalizeDraftDialog,
  RefundDialog,
  OrderTimeline,
  extractErrorMessage,
} from "@/components/orders/OrderOpsDialogs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { RestaurantNotificationHeader } from "@/components/RestaurantNotificationHeader";
import { useOrderAlert } from "@/hooks/useOrderAlert";
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

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  pending: "secondary",
  confirmed: "default",
  preparing: "default",
  ready: "default",
  shipped: "default",
  completed: "outline",
  cancelled: "destructive",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled",
};

type OrderWithItems = {
  order: Order;
  items: (OrderItem & { menuItem?: MenuItem; bundle?: Bundle })[];
};

export default function Orders() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [previousOrderCount, setPreviousOrderCount] = useState<number>(0);
  // Tier 3 — order ops dialogs
  const [draftOpen, setDraftOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<{ id: string; order: any; items: any[] } | null>(null);
  const [finalizeOrder, setFinalizeOrder] = useState<any | null>(null);
  const [refundOrder, setRefundOrder] = useState<{ order: any; items: any[] } | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  
  // PWA Features
  const { playOrderAlert } = useOrderAlert();

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

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Detect new orders and play sound alert
  useEffect(() => {
    if (orders && orders.length > 0) {
      const pendingOrders = orders.filter(o => o.status === 'pending');
      
      if (previousOrderCount > 0 && pendingOrders.length > previousOrderCount) {
        // New order detected!
        playOrderAlert();
        toast({
          title: "🍕 New Order!",
          description: `You have ${pendingOrders.length} pending order(s)`,
          duration: 5000,
        });
      }
      
      setPreviousOrderCount(pendingOrders.length);
    }
  }, [orders, previousOrderCount, playOrderAlert, toast]);

  const { data: orderDetails, isLoading: detailsLoading } = useQuery<OrderWithItems>({
    queryKey: ["/api/orders", selectedOrder],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${selectedOrder}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch order details");
      return response.json();
    },
    enabled: !!selectedOrder,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return await apiRequest(`/api/orders/${orderId}/status`, "PATCH", { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      // Also invalidate the detail query if dialog is open for this order
      if (selectedOrder === variables.orderId) {
        queryClient.invalidateQueries({ queryKey: ["/api/orders", selectedOrder] });
      }
      toast({
        title: "Status Updated",
        description: "Order status has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  const updateTrackingMutation = useMutation({
    mutationFn: async ({ orderId, trackingNumber, shippingCarrier }: { orderId: string; trackingNumber: string; shippingCarrier: string }) => {
      return await apiRequest(`/api/orders/${orderId}/status`, "PATCH", {
        status: "shipped",
        trackingNumber,
        shippingCarrier,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Tracking saved", description: "The order is now marked as shipped." });
      setTrackingOrder(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save tracking info", variant: "destructive" });
    },
  });

  const openTrackingDialog = (order: Order) => {
    setTrackingOrder(order);
    setTrackingCarrier((order as any).shippingCarrier || "");
    setTrackingNumberInput((order as any).trackingNumber || "");
  };

  const handleSaveTracking = () => {
    if (!trackingOrder || !trackingNumberInput.trim()) return;
    updateTrackingMutation.mutate({
      orderId: trackingOrder.id,
      trackingNumber: trackingNumberInput.trim(),
      shippingCarrier: trackingCarrier.trim(),
    });
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow: Record<string, string> = {
      pending: "confirmed",
      confirmed: "preparing",
      preparing: "ready",
      ready: "completed",
    };
    return statusFlow[currentStatus] || null;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "preparing":
        return <ChefHat className="h-4 w-4" />;
      case "ready":
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handlePrintTicket = async (order: Order) => {
    // HTML escape function to prevent XSS
    const escapeHtml = (unsafe: string | null | undefined): string => {
      if (!unsafe) return '';
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // Fetch full order details
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch order details");
      const orderData: OrderWithItems = await response.json();

      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      // Generate printable order ticket HTML
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Order Ticket - ${escapeHtml(orderData.order.orderNumber)}</title>
            <style>
              @media print {
                @page { 
                  margin: 0.5cm; 
                  size: 10cm 15cm;
                }
                body { margin: 0; }
                .no-print { display: none; }
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: 'Courier New', monospace;
                padding: 10px;
                background: white;
                max-width: 10cm;
                margin: 0 auto;
              }
              .ticket {
                border: 2px dashed #000;
                padding: 15px;
                background: white;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
                margin-bottom: 10px;
              }
              .order-number {
                font-size: 28px;
                font-weight: bold;
                margin: 5px 0;
              }
              .section {
                margin: 10px 0;
                padding: 8px 0;
                border-bottom: 1px dashed #000;
              }
              .section:last-child {
                border-bottom: none;
              }
              .label {
                font-weight: bold;
                font-size: 11px;
                text-transform: uppercase;
              }
              .value {
                font-size: 13px;
                margin-top: 2px;
              }
              .items {
                margin: 10px 0;
              }
              .item {
                margin: 5px 0;
                display: flex;
                justify-content: space-between;
              }
              .item-name {
                flex: 1;
                font-weight: bold;
              }
              .item-qty {
                margin: 0 10px;
              }
              .item-note {
                font-size: 11px;
                font-style: italic;
                margin-left: 10px;
              }
              .total {
                font-size: 18px;
                font-weight: bold;
                text-align: right;
                margin-top: 10px;
              }
              .footer {
                text-align: center;
                margin-top: 15px;
                font-size: 11px;
              }
              .print-btn {
                margin: 20px auto;
                display: block;
                padding: 10px 20px;
                background: #000;
                color: white;
                border: none;
                cursor: pointer;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <button class="print-btn no-print" onclick="window.print()">Print Ticket</button>
            
            <div class="ticket">
              <div class="header">
                <div class="order-number">#${escapeHtml(orderData.order.orderNumber)}</div>
                <div style="margin-top: 5px; font-size: 12px;">${escapeHtml(new Date(orderData.order.createdAt!).toLocaleString())}</div>
              </div>

              <div class="section">
                <div class="label">Order Type</div>
                <div class="value" style="text-transform: uppercase;">${escapeHtml(orderData.order.orderType)}</div>
              </div>

              <div class="section">
                <div class="label">Customer</div>
                <div class="value">${escapeHtml(orderData.order.customerName) || 'Guest'}</div>
                ${orderData.order.customerPhone ? `<div class="value">${escapeHtml(orderData.order.customerPhone)}</div>` : ''}
              </div>

              ${orderData.order.shippingAddress ? `
              <div class="section">
                <div class="label">Shipping Address</div>
                <div class="value">${escapeHtml(orderData.order.shippingAddress)}</div>
              </div>
              ` : ''}

              <div class="section">
                <div class="label">Items</div>
                <div class="items">
                  ${orderData.items.map(item => {
                    const itemName = escapeHtml(
                      item.menuItem?.name || item.bundle?.name || 'Unknown'
                    );
                    return `
                    <div class="item">
                      <span class="item-name">${itemName}</span>
                      <span class="item-qty">x${escapeHtml(String(item.quantity))}</span>
                      <span>$${escapeHtml(String(item.subtotal))}</span>
                    </div>
                    ${item.selectedOptions ? 
                      (item.selectedOptions as any[]).map((group: any) => 
                        `<div class="item-note">${escapeHtml(group.optionGroupLabel)}: ${group.choices.map((c: any) => escapeHtml(c.label)).join(', ')}</div>`
                      ).join('') 
                      : ''}
                    ${item.notes ? `<div class="item-note">Note: ${escapeHtml(item.notes)}</div>` : ''}
                  `}).join('')}
                </div>
              </div>

              ${orderData.order.notes ? `
              <div class="section">
                <div class="label">Special Instructions</div>
                <div class="value">${escapeHtml(orderData.order.notes)}</div>
              </div>
              ` : ''}

              <div class="section">
                <div style="display: flex; justify-content: space-between; margin: 3px 0;">
                  <span>Subtotal:</span>
                  <span>$${escapeHtml(String(orderData.order.subtotal))}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 3px 0;">
                  <span>Tax:</span>
                  <span>$${escapeHtml(String(orderData.order.tax))}</span>
                </div>
                <div class="total">
                  <span>TOTAL: $${escapeHtml(String(orderData.order.total))}</span>
                </div>
              </div>

              ${orderData.order.paymentMethod ? `
              <div class="section">
                <div class="label">Payment Method</div>
                <div class="value" style="text-transform: uppercase;">${escapeHtml(orderData.order.paymentMethod)}</div>
              </div>
              ` : ''}

              <div class="footer">
                <div>━━━━━━━━━━━━━━━━━━━━</div>
                <div style="margin-top: 5px;">Thank you for your order!</div>
              </div>
            </div>

            <script>
              // Auto print after page loads
              setTimeout(() => window.print(), 500);
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      toast({
        title: "Print Ready",
        description: "Order ticket is ready to print",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load order details for printing",
        variant: "destructive",
      });
    }
  };

  // Bulk operations mutations
  const bulkStatusChangeMutation = useMutation({
    mutationFn: async ({ orderIds, newStatus }: { orderIds: string[], newStatus: string }) => {
      return await Promise.all(
        orderIds.map(id => apiRequest(`/api/orders/${id}/status`, "PATCH", { status: newStatus }))
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setSelectedOrders(new Set());
      toast({
        title: "Status Updated",
        description: `Successfully updated ${variables.orderIds.length} order(s) to ${statusLabels[variables.newStatus]}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      // Settle all so one un-deletable order (paid) doesn't hide the rest succeeding.
      const results = await Promise.allSettled(
        orderIds.map(id => apiRequest(`/api/orders/${id}`, "DELETE"))
      );
      const rejected = results.filter(r => r.status === "rejected") as PromiseRejectedResult[];
      return { deleted: orderIds.length - rejected.length, rejected };
    },
    onSuccess: ({ deleted, rejected }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setSelectedOrders(new Set());
      setShowDeleteDialog(false);
      if (deleted > 0) toast({ title: "Orders deleted", description: `Deleted ${deleted} order(s)` });
      if (rejected.length > 0) {
        toast({
          variant: "destructive",
          title: `${rejected.length} order(s) kept`,
          description: extractErrorMessage(rejected[0].reason, "Paid orders can't be deleted — cancel and refund instead"),
        });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete orders", variant: "destructive" });
    },
  });

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredOrders) {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  // Bulk action handlers
  const handleBulkStatusChange = (newStatus: string) => {
    const orderIds = Array.from(selectedOrders);
    bulkStatusChangeMutation.mutate({ orderIds, newStatus });
  };

  const handleBulkDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmBulkDelete = () => {
    const orderIds = Array.from(selectedOrders);
    bulkDeleteMutation.mutate(orderIds);
  };

  const handleBulkPrint = async () => {
    const orderIds = Array.from(selectedOrders);
    const selectedOrdersData = orders?.filter(o => orderIds.includes(o.id));
    
    if (!selectedOrdersData || selectedOrdersData.length === 0) return;

    // HTML escape function to prevent XSS
    const escapeHtml = (unsafe: string | null | undefined): string => {
      if (!unsafe) return '';
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    try {
      // Fetch all order details
      const orderDetailsPromises = selectedOrdersData.map(order =>
        fetch(`/api/orders/${order.id}`, { credentials: "include" })
          .then(res => res.json())
      );
      
      const allOrderDetails = await Promise.all(orderDetailsPromises);

      // Create single print window with all tickets
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      // Generate HTML for all tickets
      const ticketsHtml = allOrderDetails.map((orderData: OrderWithItems) => `
        <div class="ticket">
          <div class="header">
            <div class="order-number">#${escapeHtml(orderData.order.orderNumber)}</div>
            <div style="margin-top: 5px; font-size: 12px;">${escapeHtml(new Date(orderData.order.createdAt!).toLocaleString())}</div>
          </div>

          <div class="section">
            <div class="label">Order Type</div>
            <div class="value" style="text-transform: uppercase;">${escapeHtml(orderData.order.orderType)}</div>
          </div>

          <div class="section">
            <div class="label">Customer</div>
            <div class="value">${escapeHtml(orderData.order.customerName) || 'Guest'}</div>
            ${orderData.order.customerPhone ? `<div class="value">${escapeHtml(orderData.order.customerPhone)}</div>` : ''}
          </div>

          ${orderData.order.shippingAddress ? `
          <div class="section">
            <div class="label">Shipping Address</div>
            <div class="value">${escapeHtml(orderData.order.shippingAddress)}</div>
          </div>
          ` : ''}

          <div class="section">
            <div class="label">Items</div>
            <div class="items">
              ${orderData.items.map(item => {
                const itemName = escapeHtml(
                  item.menuItem?.name || item.bundle?.name || 'Unknown'
                );
                return `
                <div class="item">
                  <span class="item-name">${itemName}</span>
                  <span class="item-qty">x${escapeHtml(String(item.quantity))}</span>
                  <span>$${escapeHtml(String(item.subtotal))}</span>
                </div>
                ${item.selectedOptions ? 
                  (item.selectedOptions as any[]).map((group: any) => 
                    `<div class="item-note">${escapeHtml(group.optionGroupLabel)}: ${group.choices.map((c: any) => escapeHtml(c.label)).join(', ')}</div>`
                  ).join('') 
                  : ''}
                ${item.notes ? `<div class="item-note">Note: ${escapeHtml(item.notes)}</div>` : ''}
              `}).join('')}
            </div>
          </div>

          ${orderData.order.notes ? `
          <div class="section">
            <div class="label">Special Instructions</div>
            <div class="value">${escapeHtml(orderData.order.notes)}</div>
          </div>
          ` : ''}

          <div class="section">
            <div style="display: flex; justify-content: space-between; margin: 3px 0;">
              <span>Subtotal:</span>
              <span>$${escapeHtml(String(orderData.order.subtotal))}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 3px 0;">
              <span>Tax:</span>
              <span>$${escapeHtml(String(orderData.order.tax))}</span>
            </div>
            <div class="total">
              <span>TOTAL: $${escapeHtml(String(orderData.order.total))}</span>
            </div>
          </div>

          ${orderData.order.paymentMethod ? `
          <div class="section">
            <div class="label">Payment Method</div>
            <div class="value" style="text-transform: uppercase;">${escapeHtml(orderData.order.paymentMethod)}</div>
          </div>
          ` : ''}

          <div class="footer">
            <div>━━━━━━━━━━━━━━━━━━━━</div>
            <div style="margin-top: 5px;">Thank you for your order!</div>
          </div>
        </div>
      `).join('');

      // Complete HTML document
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print ${allOrderDetails.length} Order(s)</title>
            <style>
              @media print {
                @page { 
                  margin: 0.5cm; 
                  size: 10cm auto;
                }
                body { margin: 0; }
                .no-print { display: none; }
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: 'Courier New', monospace;
                padding: 10px;
                background: white;
                max-width: 10cm;
                margin: 0 auto;
              }
              .ticket {
                border: 2px dashed #000;
                padding: 15px;
                background: white;
                margin-bottom: 20px;
                page-break-after: always;
              }
              .ticket:last-child {
                page-break-after: avoid;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
                margin-bottom: 10px;
              }
              .order-number {
                font-size: 28px;
                font-weight: bold;
                margin: 5px 0;
              }
              .section {
                margin: 10px 0;
                padding: 8px 0;
                border-bottom: 1px dashed #000;
              }
              .section:last-child {
                border-bottom: none;
              }
              .label {
                font-weight: bold;
                font-size: 11px;
                text-transform: uppercase;
              }
              .value {
                font-size: 13px;
                margin-top: 2px;
              }
              .items {
                margin: 10px 0;
              }
              .item {
                margin: 5px 0;
                display: flex;
                justify-content: space-between;
              }
              .item-name {
                flex: 1;
                font-weight: bold;
              }
              .item-qty {
                margin: 0 10px;
              }
              .item-note {
                font-size: 11px;
                font-style: italic;
                margin-left: 10px;
              }
              .total {
                font-size: 18px;
                font-weight: bold;
                text-align: right;
                margin-top: 10px;
              }
              .footer {
                text-align: center;
                margin-top: 15px;
                font-size: 11px;
              }
              .print-btn {
                margin: 20px auto;
                display: block;
                padding: 10px 20px;
                background: #000;
                color: white;
                border: none;
                cursor: pointer;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <button class="print-btn no-print" onclick="window.print()">Print All ${allOrderDetails.length} Tickets</button>
            
            ${ticketsHtml}

            <script>
              // Auto print after page loads
              setTimeout(() => window.print(), 500);
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      toast({
        title: "Print Ready",
        description: `${allOrderDetails.length} order ticket(s) ready to print`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load order details for printing",
        variant: "destructive",
      });
    }
  };

  const filteredOrders = orders?.filter(order => {
    const typeMatch = orderTypeFilter === "all" || order.orderType === orderTypeFilter;
    const statusMatch = statusFilter === "all" || order.status === statusFilter;
    return typeMatch && statusMatch;
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
      {/* PWA Features */}
      <OfflineIndicator />
      
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RestaurantNotificationHeader />
          <Button variant="outline" onClick={() => { setEditDraft(null); setDraftOpen(true); }} data-testid="button-new-draft">
            <FileText className="mr-2 h-4 w-4" />
            New Draft
          </Button>
          <Link href="/pos">
            <Button data-testid="button-new-order">
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>All Orders</CardTitle>
            <div className="flex gap-2">
              <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-order-type">
                  <SelectValue placeholder="Order Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="dine-in">Dine-in</SelectItem>
                  <SelectItem value="takeout">Takeout</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="shipping">Shipping</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Bulk Actions Toolbar */}
          {selectedOrders.size > 0 && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold" data-testid="text-selected-count">
                  {selectedOrders.size} order(s) selected
                </span>
              </div>
              
              {/* Status Change Buttons */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Change Status:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkStatusChange('pending')}
                    disabled={bulkStatusChangeMutation.isPending}
                    data-testid="button-bulk-status-pending"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Pending
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkStatusChange('confirmed')}
                    disabled={bulkStatusChangeMutation.isPending}
                    data-testid="button-bulk-status-confirmed"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmed
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkStatusChange('preparing')}
                    disabled={bulkStatusChangeMutation.isPending}
                    data-testid="button-bulk-status-preparing"
                  >
                    <ChefHat className="mr-2 h-4 w-4" />
                    Preparing
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkStatusChange('ready')}
                    disabled={bulkStatusChangeMutation.isPending}
                    data-testid="button-bulk-status-ready"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Ready
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkStatusChange('completed')}
                    disabled={bulkStatusChangeMutation.isPending}
                    data-testid="button-bulk-status-completed"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Completed
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkStatusChange('cancelled')}
                    disabled={bulkStatusChangeMutation.isPending}
                    data-testid="button-bulk-status-cancelled"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelled
                  </Button>
                </div>
              </div>

              {/* Other Actions */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Other Actions:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleBulkPrint}
                    data-testid="button-bulk-print"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Print All
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                    data-testid="button-bulk-delete"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All
                  </Button>
                </div>
              </div>
            </div>
          )}

          {filteredOrders && filteredOrders.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const nextStatus = getNextStatus(order.status);
                    return (
                      <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedOrders.has(order.id)}
                            onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                            data-testid={`checkbox-order-${order.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell className="capitalize">{order.orderType}</TableCell>
                        <TableCell>{order.customerName || "Guest"}</TableCell>
                        <TableCell>
                          {order.orderType !== "shipping" ? (
                            <span className="text-sm text-muted-foreground capitalize">{order.orderType}</span>
                          ) : (order as any).trackingNumber ? (
                            <button
                              type="button"
                              onClick={() => openTrackingDialog(order)}
                              className="flex items-center gap-1.5 text-left hover-elevate rounded-md px-1.5 py-1 -mx-1.5"
                              data-testid={`button-edit-tracking-${order.id}`}
                            >
                              <Truck className="h-4 w-4 text-primary shrink-0" />
                              <span className="flex flex-col">
                                <span className="text-sm font-medium">{(order as any).trackingNumber}</span>
                                {(order as any).shippingCarrier && (
                                  <span className="text-xs text-muted-foreground">{(order as any).shippingCarrier}</span>
                                )}
                              </span>
                            </button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openTrackingDialog(order)}
                              data-testid={`button-add-tracking-${order.id}`}
                            >
                              Add tracking
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${order.total}
                          {Number((order as any).refundedAmount) > 0 && (
                            <span className="ml-1 text-xs font-normal text-muted-foreground" data-testid={`text-refunded-${order.id}`}>
                              (−${Number((order as any).refundedAmount).toFixed(2)})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(order as any).isDraft ? (
                            <Badge variant="outline" data-testid={`badge-draft-${order.id}`}>Draft</Badge>
                          ) : (
                          <Select
                            value={order.status}
                            onValueChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                            disabled={updateStatusMutation.isPending}
                          >
                            <SelectTrigger 
                              className={`w-auto h-auto px-2.5 py-0.5 text-xs font-semibold rounded-full focus:ring-0 focus:ring-offset-0 ${
                                statusColors[order.status] === 'secondary' ? 'border-0 bg-secondary text-secondary-foreground' :
                                statusColors[order.status] === 'destructive' ? 'border-0 bg-destructive text-destructive-foreground' :
                                statusColors[order.status] === 'outline' ? 'border border-input bg-background' :
                                'border-0 bg-primary text-primary-foreground'
                              }`}
                              data-testid={`select-status-${order.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="preparing">Preparing</SelectItem>
                              <SelectItem value="ready">Ready</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.paymentStatus === "paid" ? "default" : order.paymentStatus?.includes("refund") ? "destructive" : "secondary"}>
                            {order.paymentStatus?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(order.createdAt!).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setSelectedOrder(order.id)}
                              data-testid={`button-view-order-${order.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePrintTicket(order)}
                              data-testid={`button-print-ticket-${order.id}`}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {(order as any).isDraft && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={async () => {
                                    const r = await fetch(`/api/orders/${order.id}`, { credentials: "include" });
                                    if (r.ok) { const d = await r.json(); setEditDraft({ id: order.id, order: d.order, items: d.items }); setDraftOpen(true); }
                                  }}
                                  data-testid={`button-edit-draft-${order.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => setFinalizeOrder(order)}
                                  data-testid={`button-finalize-draft-${order.id}`}
                                >
                                  <CheckCheck className="h-4 w-4 mr-1" />Finalize
                                </Button>
                              </>
                            )}
                            {nextStatus && order.status !== 'completed' && order.status !== 'cancelled' && (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleStatusChange(order.id, nextStatus)}
                                disabled={updateStatusMutation.isPending}
                                data-testid={`button-update-status-${order.id}`}
                              >
                                {getStatusIcon(nextStatus)}
                                <span className="ml-1">{statusLabels[nextStatus]}</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                {orders && orders.length > 0 ? "No orders match your filters" : "No orders yet"}
              </p>
              {(!orders || orders.length === 0) && (
                <Link href="/pos">
                  <Button data-testid="button-create-first-order">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Order
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto" data-testid="dialog-order-details">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              View order information and items
            </DialogDescription>
          </DialogHeader>
          {detailsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : orderDetails ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="font-semibold" data-testid="text-order-number">{orderDetails.order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-semibold capitalize" data-testid="text-order-type">{orderDetails.order.orderType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-semibold" data-testid="text-customer-name">{orderDetails.order.customerName || "Guest"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={statusColors[orderDetails.order.status]} data-testid="badge-order-status">
                    {statusLabels[orderDetails.order.status]}
                  </Badge>
                </div>
                {orderDetails.order.paymentMethod && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <p className="font-semibold capitalize" data-testid="text-payment-method">{orderDetails.order.paymentMethod}</p>
                  </div>
                )}
                {orderDetails.order.shippingAddress && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Shipping Address</p>
                    <p className="font-semibold" data-testid="text-shipping-address">{orderDetails.order.shippingAddress}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-3">Order Items</h3>
                <div className="space-y-2">
                  {orderDetails.items.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 rounded-md border"
                      data-testid={`order-item-${item.id}`}
                    >
                      <div className="flex-1">
                        {item.menuItem ? (
                          <>
                            <p className="font-medium">{item.menuItem.name}</p>
                            {item.selectedOptions && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {(item.selectedOptions as any[]).map((group: any, idx: number) => (
                                  <div key={idx}>
                                    {group.optionGroupLabel}: {group.choices.map((c: any) => c.label).join(', ')}
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : item.bundle ? (
                          <>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{item.bundle.name}</p>
                              <Badge variant="default" className="text-xs">Bundle</Badge>
                            </div>
                            {item.bundle.items && item.bundle.items.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.bundle.items.join(' • ')}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="font-medium text-muted-foreground">Unknown item</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          ${item.unitPrice} × {item.quantity}
                        </p>
                        {item.notes && (
                          <p className="text-sm text-muted-foreground italic">Note: {item.notes}</p>
                        )}
                      </div>
                      <p className="font-semibold">${item.subtotal}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span data-testid="text-subtotal">${orderDetails.order.subtotal}</span>
                </div>
                {Number((orderDetails.order as any).loyaltyDiscount) > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Points redeemed</span>
                    <span>-${Number((orderDetails.order as any).loyaltyDiscount).toFixed(2)}</span>
                  </div>
                )}
                {Number((orderDetails.order as any).storeCreditUsed) > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Store credit</span>
                    <span>-${Number((orderDetails.order as any).storeCreditUsed).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span data-testid="text-tax">${orderDetails.order.tax}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span data-testid="text-total">${orderDetails.order.total}</span>
                </div>
                {Number((orderDetails.order as any).refundedAmount) > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Refunded</span>
                    <span data-testid="text-refunded">-${Number((orderDetails.order as any).refundedAmount).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Order-ops actions */}
              <div className="flex flex-wrap gap-2">
                {(orderDetails.order as any).isDraft ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => { setEditDraft({ id: orderDetails.order.id, order: orderDetails.order, items: orderDetails.items }); setDraftOpen(true); }}
                      data-testid="button-detail-edit-draft"
                    >
                      <Pencil className="mr-2 h-4 w-4" />Edit draft
                    </Button>
                    <Button onClick={() => setFinalizeOrder(orderDetails.order)} data-testid="button-detail-finalize">
                      <CheckCheck className="mr-2 h-4 w-4" />Finalize
                    </Button>
                  </>
                ) : (
                  Number((orderDetails.order as any).refundedAmount || 0) < Number(orderDetails.order.total) && (
                    <Button
                      variant="outline"
                      onClick={() => setRefundOrder({ order: orderDetails.order, items: orderDetails.items })}
                      data-testid="button-detail-refund"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />Issue refund
                    </Button>
                  )
                )}
              </div>

              {orderDetails.order.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Order Notes</p>
                  <p className="mt-1" data-testid="text-order-notes">{orderDetails.order.notes}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <OrderTimeline orderId={orderDetails.order.id} open={!!selectedOrder} />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <DraftBuilderDialog
        open={draftOpen}
        onOpenChange={(v) => { setDraftOpen(v); if (!v) setEditDraft(null); }}
        editOrder={editDraft}
      />
      {finalizeOrder && (
        <FinalizeDraftDialog
          order={finalizeOrder}
          open={!!finalizeOrder}
          onOpenChange={(v) => !v && setFinalizeOrder(null)}
        />
      )}
      {refundOrder && (
        <RefundDialog
          order={refundOrder.order}
          items={refundOrder.items}
          open={!!refundOrder}
          onOpenChange={(v) => !v && setRefundOrder(null)}
        />
      )}

      <Dialog open={!!trackingOrder} onOpenChange={(v) => !v && setTrackingOrder(null)}>
        <DialogContent data-testid="dialog-tracking">
          <DialogHeader>
            <DialogTitle>Shipping tracking</DialogTitle>
            <DialogDescription>
              {trackingOrder ? `Order #${trackingOrder.orderNumber}` : ""} — saving marks this order as shipped and shows the tracking info to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tracking-carrier">Carrier (optional)</Label>
              <Input
                id="tracking-carrier"
                placeholder="e.g. DHL, UPS, FedEx"
                value={trackingCarrier}
                onChange={(e) => setTrackingCarrier(e.target.value)}
                data-testid="input-tracking-carrier"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tracking-number">Tracking number</Label>
              <Input
                id="tracking-number"
                placeholder="e.g. 1Z999AA10123456784"
                value={trackingNumberInput}
                onChange={(e) => setTrackingNumberInput(e.target.value)}
                data-testid="input-tracking-number"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSaveTracking}
              disabled={!trackingNumberInput.trim() || updateTrackingMutation.isPending}
              data-testid="button-save-tracking"
            >
              Save & mark as shipped
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-bulk-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedOrders.size} Order(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedOrders.size} selected order(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete}
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
