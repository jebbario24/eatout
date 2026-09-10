import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Package,
  AlertCircle,
  DollarSign,
  Truck,
} from "lucide-react";

// This page has no login — it's reached only via a merchant-issued link
// (/deliver/:token). Every request carries the token as a header instead of
// a session cookie; see deliveryLinkAuth on the server.
async function deliverFetch(token: string, path: string, method = "GET", body?: unknown) {
  const res = await fetch(`/api/deliver${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Delivery-Token": token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    let message = text;
    try {
      message = JSON.parse(text).message || text;
    } catch {
      // plain text error, use as-is
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

interface Me {
  id: string;
  firstName: string;
  lastName: string;
  isAvailable: boolean;
  restaurantName: string | null;
}

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  total: string;
  status: string;
  pickupTime: string | null;
  restaurant?: { name: string; address: string | null };
}

export default function DeliveryLink() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sharingLocation, setSharingLocation] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const meQuery = useQuery<Me>({
    queryKey: ["deliver-me", token],
    queryFn: () => deliverFetch(token!, "/me"),
    enabled: !!token,
    retry: false,
  });

  const activeQuery = useQuery<DeliveryOrder | null>({
    queryKey: ["deliver-active", token],
    queryFn: () => deliverFetch(token!, "/active-delivery"),
    enabled: !!token && !!meQuery.data,
    refetchInterval: 15000,
  });

  const availableQuery = useQuery<DeliveryOrder[]>({
    queryKey: ["deliver-available", token],
    queryFn: () => deliverFetch(token!, "/available-orders"),
    enabled: !!token && !!meQuery.data && !activeQuery.data,
    refetchInterval: 10000,
  });

  const statsQuery = useQuery<{ deliveriesToday: number; earningsToday: string }>({
    queryKey: ["deliver-stats", token],
    queryFn: () => deliverFetch(token!, "/stats"),
    enabled: !!token && !!meQuery.data,
  });

  const toggleAvailability = useMutation({
    mutationFn: (isAvailable: boolean) => deliverFetch(token!, "/status", "POST", { isAvailable }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliver-me", token] }),
  });

  const acceptOrder = useMutation({
    mutationFn: (orderId: string) => deliverFetch(token!, `/orders/${orderId}/accept`, "POST"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliver-active", token] });
      qc.invalidateQueries({ queryKey: ["deliver-available", token] });
      toast({ title: "Order accepted" });
    },
    onError: (e: any) => toast({ title: "Couldn't accept order", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      deliverFetch(token!, `/orders/${activeQuery.data!.id}/status`, "POST", { status }),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ["deliver-active", token] });
      qc.invalidateQueries({ queryKey: ["deliver-stats", token] });
      if (status === "delivered") {
        setSharingLocation(false);
        toast({ title: "Delivery completed" });
      }
    },
    onError: (e: any) => toast({ title: "Couldn't update status", description: e.message, variant: "destructive" }),
  });

  // Live location sharing while actively out on a delivery
  useEffect(() => {
    if (!sharingLocation || !token || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        deliverFetch(token, "/location", "PUT", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [sharingLocation, token]);

  // Auto-start sharing location once there's an active delivery to run
  useEffect(() => {
    if (activeQuery.data) setSharingLocation(true);
  }, [activeQuery.data?.id]);

  if (!token || meQuery.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="font-semibold">This delivery link isn't valid</p>
            <p className="text-sm text-muted-foreground">
              It may have been deactivated. Ask the business for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (meQuery.isLoading || !meQuery.data) {
    return (
      <div className="min-h-screen bg-muted/30 p-4">
        <div className="max-w-lg mx-auto space-y-4 pt-8">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const me = meQuery.data;
  const active = activeQuery.data;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b p-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="font-semibold" data-testid="text-driver-name">
              {me.firstName} {me.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{me.restaurantName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{me.isAvailable ? "Online" : "Offline"}</span>
            <Switch
              checked={me.isAvailable}
              onCheckedChange={(v) => toggleAvailability.mutate(v)}
              data-testid="switch-availability"
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {statsQuery.data && (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold" data-testid="text-deliveries-today">
                  {statsQuery.data.deliveriesToday}
                </p>
                <p className="text-xs text-muted-foreground">Deliveries today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold" data-testid="text-earnings-today">
                  ${statsQuery.data.earningsToday}
                </p>
                <p className="text-xs text-muted-foreground">Earnings today</p>
              </CardContent>
            </Card>
          </div>
        )}

        {active ? (
          <Card data-testid="card-active-delivery">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="gap-1">
                  <Truck className="h-3 w-3" />
                  {active.pickupTime ? "Out for delivery" : "Ready for pickup"}
                </Badge>
                <span className="text-sm text-muted-foreground">#{active.orderNumber}</span>
              </div>

              <div className="space-y-2">
                {active.customerName && (
                  <p className="font-medium">{active.customerName}</p>
                )}
                {active.deliveryAddress && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      {active.deliveryAddress}
                      {active.deliveryCity ? `, ${active.deliveryCity}` : ""}
                    </span>
                  </div>
                )}
                {active.customerPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <a href={`tel:${active.customerPhone}`} className="underline">
                      {active.customerPhone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4 shrink-0" />
                  {active.total}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Navigation className="h-3.5 w-3.5" />
                {sharingLocation ? "Sharing your live location" : "Location sharing paused"}
              </div>

              {!active.pickupTime ? (
                <Button
                  className="w-full"
                  onClick={() => updateStatus.mutate("picked_up")}
                  disabled={updateStatus.isPending}
                  data-testid="button-mark-picked-up"
                >
                  Mark Picked Up
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => updateStatus.mutate("delivered")}
                  disabled={updateStatus.isPending}
                  data-testid="button-mark-delivered"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Delivered
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground px-1">Available Orders</h2>
            {availableQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !availableQuery.data || availableQuery.data.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No orders available right now</p>
                  <p className="text-sm mt-1">
                    {me.isAvailable ? "Check back soon" : "Go online to see new orders"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              availableQuery.data.map((order) => (
                <Card key={order.id} data-testid={`card-available-order-${order.id}`}>
                  <CardContent className="pt-4 pb-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">#{order.orderNumber}</span>
                      <span className="font-semibold">${order.total}</span>
                    </div>
                    {order.deliveryAddress && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                          {order.deliveryAddress}
                          {order.deliveryCity ? `, ${order.deliveryCity}` : ""}
                        </span>
                      </div>
                    )}
                    <Button
                      className="w-full"
                      onClick={() => acceptOrder.mutate(order.id)}
                      disabled={acceptOrder.isPending}
                      data-testid={`button-accept-${order.id}`}
                    >
                      Accept Delivery
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
