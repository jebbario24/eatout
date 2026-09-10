import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Store, MapPin, Clock, DollarSign, Navigation, Phone, Package } from "lucide-react";

interface OrderPreviewModalProps {
  order: {
    id: string;
    orderNumber: string;
    total: string;
    deliveryAddress: string;
    estimatedEarnings: string;
    restaurant: {
      name: string;
      address: string;
      phone: string;
    };
    createdAt: string;
    deliveryZone?: {
      city: string;
      neighborhood?: string;
    };
  };
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  distance?: string;
  estimatedTime?: string;
  isLoading?: boolean;
}

export function OrderPreviewModal({
  order,
  open,
  onClose,
  onAccept,
  distance,
  estimatedTime,
  isLoading = false,
}: OrderPreviewModalProps) {
  const openNavigation = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      window.open(`maps://maps.apple.com/?daddr=${encodedAddress}`);
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5" />
            Order #{order.orderNumber} - Preview
          </DialogTitle>
          <DialogDescription>
            Review order details before accepting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Earnings Highlight */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Earnings</p>
                <p className="text-3xl font-bold text-green-600">
                  ${Number(order.estimatedEarnings).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Order Total</p>
                <p className="text-xl font-semibold">
                  ${Number(order.total).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Restaurant Info */}
          <div className="space-y-3">
            <div className="flex items-start justify-between p-3 border rounded-lg">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{order.restaurant.name}</p>
                  <p className="text-sm text-muted-foreground">{order.restaurant.address}</p>
                  <p className="text-sm text-muted-foreground">{order.restaurant.phone}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openNavigation(order.restaurant.address)}
                  className="h-8 w-8 p-0"
                  title="Navigate to Restaurant"
                >
                  <Navigation className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`tel:${order.restaurant.phone}`)}
                  className="h-8 w-8 p-0"
                  title="Call Restaurant"
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold mb-1">Delivery Address</p>
                  <p className="text-sm text-muted-foreground mb-2">{order.deliveryAddress}</p>
                  {order.deliveryZone && (
                    <Badge variant="secondary" className="text-xs">
                      {order.deliveryZone.city}{order.deliveryZone.neighborhood ? ` - ${order.deliveryZone.neighborhood}` : ''}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openNavigation(order.deliveryAddress)}
                  className="h-8 w-8 p-0"
                  title="Navigate to Customer"
                >
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Distance & Time Estimates */}
          {(distance || estimatedTime) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {distance && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Distance</p>
                    </div>
                    <p className="text-lg font-semibold">{distance}</p>
                  </div>
                )}
                {estimatedTime && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Est. Time</p>
                    </div>
                    <p className="text-lg font-semibold">{estimatedTime}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Order Time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Order placed {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={onAccept}
              className="flex-1"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Accepting...
                </>
              ) : (
                <>
                  Accept Order
                  <DollarSign className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

