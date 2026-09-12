import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, PackageSearch, CheckCircle2, Circle, Truck } from "lucide-react";

function useResolvedSlug() {
  const params = useParams();
  const paramSlug = (params as any).slug as string | undefined;
  const { data } = useQuery<{ slug: string } | null>({
    queryKey: ["/api/storefront/by-hostname"],
    enabled: !paramSlug,
    queryFn: async () => {
      const r = await fetch("/api/storefront/by-hostname");
      return r.ok ? r.json() : null;
    },
  });
  return paramSlug || data?.slug;
}

const STEPS = ["pending", "confirmed", "preparing", "ready", "shipped", "completed"];
const LABELS: Record<string, string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  shipped: "Shipped",
  completed: "Completed",
};

export default function OrderTracking() {
  const slug = useResolvedSlug();
  const storeHref = slug ? `/store/${slug}` : "/";
  const [orderNumber, setOrderNumber] = useState("");
  const [contact, setContact] = useState("");
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setResult(null); setBusy(true);
    try {
      const r = await fetch(`/api/storefront/${slug}/order-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, contact }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Not found");
      setResult(d);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const order = result?.order;
  const status: string = order?.status || "pending";
  const cancelled = status === "cancelled";
  const currentIdx = STEPS.indexOf(status);
  const steps = order?.orderType === "pickup" ? STEPS.filter((s) => s !== "shipped") : STEPS;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href={storeHref}>
        <Button variant="ghost" size="sm" className="mb-6"><ArrowLeft className="mr-1 h-4 w-4" />Back to store</Button>
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <PackageSearch className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Track your order</h1>
      </div>

      <form onSubmit={lookup} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="track-num">Order number</Label>
          <Input id="track-num" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="WEB-001" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="track-contact">Email or phone on the order</Label>
          <Input id="track-contact" value={contact} onChange={(e) => setContact(e.target.value)} required />
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" disabled={busy || !slug}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Look up order
        </Button>
      </form>

      {order && (
        <Card className="mt-8">
          <CardContent className="py-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-semibold">#{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString()} · ${Number(order.total).toFixed(2)}
                </p>
              </div>
              {cancelled && <Badge variant="secondary" className="bg-destructive/15 text-destructive">Cancelled</Badge>}
            </div>

            {!cancelled && (
              <ol className="space-y-3">
                {steps.map((s, i) => {
                  const reached = i <= currentIdx;
                  return (
                    <li key={s} className="flex items-center gap-3">
                      {reached
                        ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                        : <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />}
                      <span className={reached ? "font-medium" : "text-muted-foreground"}>{LABELS[s]}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            {order.trackingNumber && (
              <div className="mt-5 flex items-start gap-3 rounded-md border p-3 text-sm">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">Tracking</p>
                  <p className="text-muted-foreground">
                    {order.shippingCarrier ? `${order.shippingCarrier} · ` : ""}{order.trackingNumber}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 border-t pt-4 text-sm">
              {(result.items || []).map((it: any, idx: number) => (
                <div key={idx} className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">{it.quantity}× {it.menuItem?.name || it.bundle?.name || "Item"}</span>
                  <span>${Number(it.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
