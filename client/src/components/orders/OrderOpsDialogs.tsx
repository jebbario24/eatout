import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { MenuItem } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, Search, Clock, RotateCcw, StickyNote, Truck, User, CreditCard } from "lucide-react";

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const body = error.message.replace(/^\d+:\s*/, "");
    try {
      const parsed = JSON.parse(body);
      if (parsed?.message) return parsed.message;
    } catch { /* not JSON */ }
  }
  return fallback;
}

const money = (n: number | string) => `$${Number(n).toFixed(2)}`;

type DraftLine = { menuItemId: string; name: string; unitPrice: string; quantity: number; notes?: string };

/* ------------------------------------------------------------------ */
/*  Draft order builder — create or edit                              */
/* ------------------------------------------------------------------ */

export function DraftBuilderDialog({
  open, onOpenChange, editOrder,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** when set, the dialog edits this existing draft instead of creating one */
  editOrder?: { id: string; order: any; items: any[] } | null;
}) {
  const { toast } = useToast();
  const { data: menuItems = [] } = useQuery<MenuItem[]>({ queryKey: ["/api/menu/items"], enabled: open });

  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [orderType, setOrderType] = useState("pickup");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editOrder) {
      setOrderType(editOrder.order.orderType || "pickup");
      setCustomerName(editOrder.order.customerName || "");
      setCustomerPhone(editOrder.order.customerPhone || "");
      setCustomerEmail(editOrder.order.customerEmail || "");
      setNotes(editOrder.order.notes || "");
      setLines(
        (editOrder.items || [])
          .filter((it: any) => it.menuItemId)
          .map((it: any) => ({
            menuItemId: it.menuItemId,
            name: it.menuItem?.name || "Item",
            unitPrice: String(it.unitPrice),
            quantity: it.quantity,
            notes: it.notes || undefined,
          })),
      );
    } else {
      setLines([]); setOrderType("pickup"); setCustomerName(""); setCustomerPhone(""); setCustomerEmail(""); setNotes("");
    }
    setSearch("");
  }, [open, editOrder]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((m) => !q || m.name.toLowerCase().includes(q)).slice(0, 40);
  }, [menuItems, search]);

  const addItem = (m: MenuItem) => {
    setLines((prev) => {
      const found = prev.find((l) => l.menuItemId === m.id);
      if (found) return prev.map((l) => (l.menuItemId === m.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { menuItemId: m.id, name: m.name, unitPrice: String(m.price), quantity: 1 }];
    });
  };
  const setQty = (id: string, delta: number) =>
    setLines((prev) =>
      prev
        .map((l) => (l.menuItemId === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );

  const subtotal = lines.reduce((s, l) => s + Number(l.unitPrice) * l.quantity, 0);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        orderType,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        notes: notes || null,
        items: lines.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          notes: l.notes || null,
        })),
      };
      if (editOrder) return apiRequest(`/api/orders/${editOrder.id}/draft`, "PATCH", payload);
      return apiRequest("/api/orders/draft", "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      if (editOrder) queryClient.invalidateQueries({ queryKey: ["/api/orders", editOrder.id] });
      toast({ title: editOrder ? "Draft updated" : "Draft created" });
      onOpenChange(false);
    },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to save draft") }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto" data-testid="dialog-draft-builder">
        <DialogHeader>
          <DialogTitle>{editOrder ? `Edit draft ${editOrder.order.orderNumber}` : "New draft order"}</DialogTitle>
          <DialogDescription>Build an order for a phone or counter customer. It won't hit the kitchen until you finalize it.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-2">
          {/* item picker */}
          <div>
            <Label className="text-sm">Add items</Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search menu" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-draft-item-search" />
            </div>
            <ScrollArea className="mt-2 h-52 rounded-md border">
              <div className="p-1">
                {filteredItems.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => addItem(m)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    data-testid={`draft-add-${m.id}`}
                  >
                    <span className="truncate">{m.name}</span>
                    <span className="text-muted-foreground">{money(m.price)}</span>
                  </button>
                ))}
                {filteredItems.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted-foreground">No items</p>}
              </div>
            </ScrollArea>
          </div>

          {/* customer + type */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Order type</Label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger data-testid="select-draft-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="dine_in">Dine-in</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Customer name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} data-testid="input-draft-name" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Phone</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} data-testid="input-draft-phone" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Email</Label>
                <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} data-testid="input-draft-email" />
              </div>
            </div>
          </div>
        </div>

        {/* line items */}
        <div className="mt-2">
          <Label className="text-sm">Items ({lines.length})</Label>
          <div className="mt-1.5 space-y-1.5">
            {lines.length === 0 && <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">No items yet — pick from the list above</p>}
            {lines.map((l) => (
              <div key={l.menuItemId} className="flex items-center gap-2 rounded-md border p-2" data-testid={`draft-line-${l.menuItemId}`}>
                <div className="flex-1">
                  <p className="text-sm font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{money(l.unitPrice)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(l.menuItemId, -1)}><Minus className="h-3 w-3" /></Button>
                  <span className="w-7 text-center text-sm" data-testid={`draft-qty-${l.menuItemId}`}>{l.quantity}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(l.menuItemId, 1)}><Plus className="h-3 w-3" /></Button>
                </div>
                <span className="w-16 text-right text-sm font-semibold">{money(Number(l.unitPrice) * l.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Order notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergies, delivery instructions…" data-testid="input-draft-notes" />
        </div>

        <Separator />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal (tax added on finalize)</span>
          <span className="text-lg font-bold" data-testid="draft-subtotal">{money(subtotal)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={lines.length === 0 || save.isPending} data-testid="button-save-draft">
            {save.isPending ? "Saving…" : editOrder ? "Save draft" : "Create draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Finalize draft                                                    */
/* ------------------------------------------------------------------ */

export function FinalizeDraftDialog({
  order, open, onOpenChange,
}: {
  order: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [markPaid, setMarkPaid] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  useEffect(() => { if (open) { setMarkPaid(true); setPaymentMethod("cash"); } }, [open]);

  const finalize = useMutation({
    mutationFn: async () =>
      apiRequest(`/api/orders/${order.id}/draft/finalize`, "POST", { markPaid, paymentMethod: markPaid ? paymentMethod : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", order.id] });
      toast({ title: "Draft finalized", description: "The order is now live." });
      onOpenChange(false);
    },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to finalize") }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-finalize-draft">
        <DialogHeader>
          <DialogTitle>Finalize {order?.orderNumber}</DialogTitle>
          <DialogDescription>Move this draft into the live order flow.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Mark as paid</div>
              <div className="text-xs text-muted-foreground">Turn off if the customer still needs to pay.</div>
            </div>
            <Switch checked={markPaid} onCheckedChange={setMarkPaid} data-testid="switch-finalize-paid" />
          </div>
          {markPaid && (
            <div className="space-y-1.5">
              <Label className="text-sm">Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="select-finalize-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card_terminal">Card (in person)</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="manual">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Total <span className="font-semibold">{money(order?.total || 0)}</span> · a customer profile will be created/updated and loyalty points awarded when paid.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => finalize.mutate()} disabled={finalize.isPending} data-testid="button-confirm-finalize">
            {finalize.isPending ? "Finalizing…" : "Finalize order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Refund                                                            */
/* ------------------------------------------------------------------ */

export function RefundDialog({
  order, items, open, onOpenChange,
}: {
  order: any;
  items: any[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const total = Number(order?.total || 0);
  const alreadyRefunded = Number(order?.refundedAmount || 0);
  const remaining = Math.max(0, Math.round((total - alreadyRefunded) * 100) / 100);

  const canRefundToCard = order?.paymentProvider === "stripe" && !!order?.paymentIntentId;
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<string>(canRefundToCard ? "original_payment" : "manual");
  const [restock, setRestock] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(remaining.toFixed(2));
      setReason("");
      setMethod(canRefundToCard ? "original_payment" : (order?.customerId ? "store_credit" : "manual"));
      setRestock(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const refund = useMutation({
    mutationFn: async () =>
      apiRequest(`/api/orders/${order.id}/refund`, "POST", {
        amount: Number(amount),
        reason: reason.trim() || null,
        method,
        restock,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", order.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", order.id, "refunds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", order.id, "events"] });
      toast({ title: "Refund issued" });
      onOpenChange(false);
    },
    onError: (e) => toast({ variant: "destructive", title: "Refund failed", description: extractErrorMessage(e, "Could not issue refund") }),
  });

  const amountNum = Number(amount);
  const invalid = !(amountNum > 0) || amountNum > remaining + 0.001;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-refund">
        <DialogHeader>
          <DialogTitle>Refund {order?.orderNumber}</DialogTitle>
          <DialogDescription>
            {money(remaining)} of {money(total)} still refundable
            {alreadyRefunded > 0 && ` · ${money(alreadyRefunded)} already refunded`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Amount</Label>
            <Input
              type="number" step="0.01" min="0" max={remaining}
              value={amount} onChange={(e) => setAmount(e.target.value)}
              data-testid="input-refund-amount"
            />
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setAmount(remaining.toFixed(2))}>Full ({money(remaining)})</Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setAmount((remaining / 2).toFixed(2))}>Half</Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Refund to</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger data-testid="select-refund-method"><SelectValue /></SelectTrigger>
              <SelectContent>
                {canRefundToCard && <SelectItem value="original_payment">Original card</SelectItem>}
                <SelectItem value="store_credit" disabled={!order?.customerId}>
                  Store credit{!order?.customerId ? " (no customer)" : ""}
                </SelectItem>
                <SelectItem value="manual">Manual / cash (record only)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Missing item, customer complaint…" data-testid="input-refund-reason" />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch checked={restock} onCheckedChange={setRestock} data-testid="switch-refund-restock" />
            Record these items as returned to stock
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => refund.mutate()} disabled={invalid || refund.isPending} data-testid="button-confirm-refund">
            {refund.isPending ? "Processing…" : `Refund ${money(amountNum || 0)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline                                                          */
/* ------------------------------------------------------------------ */

const eventIcon: Record<string, any> = {
  status: Clock, driver: Truck, refund: RotateCcw, note: StickyNote, payment: CreditCard, draft: User, created: User,
};

export function OrderTimeline({ orderId, open }: { orderId: string; open: boolean }) {
  const { toast } = useToast();
  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/orders", orderId, "events"],
    enabled: open && !!orderId,
    queryFn: async () => {
      const r = await fetch(`/api/orders/${orderId}/events`, { credentials: "include" });
      return r.ok ? r.json() : [];
    },
  });
  const [note, setNote] = useState("");
  const addNote = useMutation({
    mutationFn: async () => apiRequest(`/api/orders/${orderId}/note`, "POST", { note: note.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "events"] });
      setNote("");
    },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to add note") }),
  });

  return (
    <div>
      <h3 className="mb-3 font-semibold">Timeline</h3>
      <div className="flex gap-2">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note to this order…" data-testid="input-timeline-note"
          onKeyDown={(e) => e.key === "Enter" && note.trim() && addNote.mutate()} />
        <Button variant="outline" disabled={!note.trim() || addNote.isPending} onClick={() => addNote.mutate()} data-testid="button-add-note">Add</Button>
      </div>
      <ul className="mt-3 space-y-3">
        {events.length === 0 && <li className="text-sm text-muted-foreground">No activity yet.</li>}
        {events.map((ev) => {
          const Icon = eventIcon[ev.type] || Clock;
          return (
            <li key={ev.id} className="flex gap-3 text-sm" data-testid={`timeline-event-${ev.id}`}>
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div>
                <p>{ev.message}</p>
                <p className="text-xs text-muted-foreground">{new Date(ev.createdAt).toLocaleString()}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
