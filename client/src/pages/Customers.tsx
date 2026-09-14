import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Coins, Wallet, Star, MessageSquare } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const bodyText = error.message.replace(/^\d+:\s*/, "");
    try {
      const parsed = JSON.parse(bodyText);
      if (parsed?.message) return parsed.message;
    } catch {
      /* not JSON */
    }
  }
  return fallback;
}

type CustomerRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  ordersCount: number;
  lifetimeValueCents: number;
  storeCreditCents: number;
  hasAccount: boolean;
  lastOrderAt: string | null;
  pointsBalance: number | null;
  tierId: string | null;
};

type CustomerDetail = {
  customer: CustomerRow & { createdAt: string | null; firstOrderAt: string | null };
  orders: Array<{ id: string; orderNumber: string; total: string; status: string; createdAt: string }>;
  loyaltyAccount: { pointsBalance: number; lifetimePoints: number } | null;
  loyaltyTx: Array<{ id: string; type: string; points: number; description: string | null; createdAt: string }>;
  creditTx: Array<{ id: string; type: string; amountCents: number; reason: string | null; createdAt: string }>;
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function Customers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery<CustomerRow[]>({
    queryKey: ["/api/customers", debounced],
    queryFn: async () => {
      const url = debounced ? `/api/customers?q=${encodeURIComponent(debounced)}` : "/api/customers";
      const res = await apiRequest(url, "GET");
      return res.json();
    },
  });

  const { data: detail } = useQuery<CustomerDetail>({
    queryKey: [`/api/customers/${selectedId}`],
    enabled: !!selectedId,
  });

  const [pointsInput, setPointsInput] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const [creditInput, setCreditInput] = useState("");
  const [creditReason, setCreditReason] = useState("");

  const adjustLoyalty = useMutation({
    mutationFn: async () =>
      apiRequest(`/api/customers/${selectedId}/loyalty-adjust`, "POST", {
        points: Math.trunc(Number(pointsInput) || 0),
        reason: pointsReason.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${selectedId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setPointsInput("");
      setPointsReason("");
      toast({ title: "Done", description: "Points adjusted" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Adjustment failed") }),
  });

  const adjustCredit = useMutation({
    mutationFn: async () =>
      apiRequest(`/api/customers/${selectedId}/credit-adjust`, "POST", {
        amountCents: Math.round((Number(creditInput) || 0) * 100),
        reason: creditReason.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${selectedId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setCreditInput("");
      setCreditReason("");
      toast({ title: "Done", description: "Store credit adjusted" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Adjustment failed") }),
  });

  const runSearch = () => setDebounced(search.trim());

  const totalLtv = rows.reduce((s, r) => s + (r.lifetimeValueCents || 0), 0);
  const withAccounts = rows.filter((r) => r.hasAccount).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground mt-1">Everyone who has ordered from your store, with points and store credit.</p>
        </div>
        <Button variant="outline" asChild data-testid="link-view-inbox">
          <Link href="/inbox">
            <MessageSquare className="mr-2 h-4 w-4" />
            Inbox & Reviews
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows.length}</div>
            <p className="text-xs text-muted-foreground">{withAccounts} with a saved account</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifetime revenue</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(totalLtv)}</div>
            <p className="text-xs text-muted-foreground">Across all listed customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding credit</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(rows.reduce((s, r) => s + (r.storeCreditCents || 0), 0))}</div>
            <p className="text-xs text-muted-foreground">Store credit customers can spend</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All customers</CardTitle>
          <CardDescription>Click a row to view orders, points and adjust balances.</CardDescription>
          <div className="flex gap-2 pt-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search name, email or phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                data-testid="input-customer-search"
              />
            </div>
            <Button variant="outline" onClick={runSearch} data-testid="button-customer-search">Search</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No customers yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Lifetime</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Last order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(r.id)}
                    data-testid={`row-customer-${r.id}`}
                  >
                    <TableCell className="font-medium">
                      {r.name || "Guest"}
                      {r.hasAccount && <Badge variant="outline" className="ml-2">Account</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.email || r.phone || "—"}
                    </TableCell>
                    <TableCell className="text-right">{r.ordersCount}</TableCell>
                    <TableCell className="text-right">{money(r.lifetimeValueCents)}</TableCell>
                    <TableCell className="text-right">{(r.pointsBalance ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{money(r.storeCreditCents)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.lastOrderAt ? new Date(r.lastOrderAt).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="dialog-customer">
          <DialogHeader>
            <DialogTitle>{detail?.customer.name || "Customer"}</DialogTitle>
            <DialogDescription>
              {detail?.customer.email || detail?.customer.phone || "No contact on file"}
            </DialogDescription>
          </DialogHeader>

          {!detail ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Orders</div>
                  <div className="text-lg font-semibold">{detail.customer.ordersCount}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Lifetime</div>
                  <div className="text-lg font-semibold">{money(detail.customer.lifetimeValueCents)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Points</div>
                  <div className="text-lg font-semibold">{(detail.loyaltyAccount?.pointsBalance ?? 0).toLocaleString()}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Store credit</div>
                  <div className="text-lg font-semibold">{money(detail.customer.storeCreditCents)}</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4" /> Adjust points</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="pts">Points (use a negative number to remove)</Label>
                      <Input id="pts" type="number" value={pointsInput} onChange={(e) => setPointsInput(e.target.value)} data-testid="input-points-adjust" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="pts-reason">Reason</Label>
                      <Input id="pts-reason" value={pointsReason} onChange={(e) => setPointsReason(e.target.value)} placeholder="Goodwill gesture" data-testid="input-points-reason" />
                    </div>
                    <Button
                      size="sm"
                      disabled={adjustLoyalty.isPending || !Number(pointsInput)}
                      onClick={() => adjustLoyalty.mutate()}
                      data-testid="button-adjust-points"
                    >
                      {adjustLoyalty.isPending ? "Applying…" : "Apply"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" /> Adjust store credit</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="cr">Amount in $ (negative to deduct)</Label>
                      <Input id="cr" type="number" step="0.01" value={creditInput} onChange={(e) => setCreditInput(e.target.value)} data-testid="input-credit-adjust" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cr-reason">Reason</Label>
                      <Input id="cr-reason" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} placeholder="Refund for order #1234" data-testid="input-credit-reason" />
                    </div>
                    <Button
                      size="sm"
                      disabled={adjustCredit.isPending || !Number(creditInput)}
                      onClick={() => adjustCredit.mutate()}
                      data-testid="button-adjust-credit"
                    >
                      {adjustCredit.isPending ? "Applying…" : "Apply"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Recent orders</h3>
                {detail.orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.orders.slice(0, 10).map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium">{o.orderNumber}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                          <TableCell className="text-right">${Number(o.total).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {(detail.loyaltyTx.length > 0 || detail.creditTx.length > 0) && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-2">Points history</h3>
                    {detail.loyaltyTx.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {detail.loyaltyTx.map((tx) => (
                          <li key={tx.id} className="flex justify-between border-b py-1">
                            <span className="text-muted-foreground">{tx.description || tx.type}</span>
                            <span className={tx.points >= 0 ? "text-primary" : "text-destructive"}>
                              {tx.points >= 0 ? "+" : ""}{tx.points}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Credit history</h3>
                    {detail.creditTx.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {detail.creditTx.map((tx) => (
                          <li key={tx.id} className="flex justify-between border-b py-1">
                            <span className="text-muted-foreground">{tx.reason || tx.type}</span>
                            <span className={tx.amountCents >= 0 ? "text-primary" : "text-destructive"}>
                              {tx.amountCents >= 0 ? "+" : "-"}{money(Math.abs(tx.amountCents))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
