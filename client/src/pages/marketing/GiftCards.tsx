import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Gift, Search, Wallet, Ban, CheckCircle2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

function extractErrorMessage(error: unknown, fallback: string): string {
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

type GiftCard = {
  id: string;
  code: string;
  initialBalance: string;
  balance: string;
  currency: string;
  status: string;
  recipientName: string | null;
  recipientEmail: string | null;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  disabled: "destructive",
  redeemed: "secondary",
  expired: "outline",
};

export default function GiftCards() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [issueOpen, setIssueOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: cards = [], isLoading } = useQuery<GiftCard[]>({
    queryKey: ["/api/gift-cards", debounced],
    queryFn: async () => {
      const url = debounced ? `/api/gift-cards?q=${encodeURIComponent(debounced)}` : "/api/gift-cards";
      const res = await apiRequest(url, "GET");
      return res.json();
    },
  });

  const { data: detail } = useQuery<{ card: GiftCard; transactions: any[] }>({
    queryKey: [`/api/gift-cards/${selectedId}`],
    enabled: !!selectedId,
  });

  const [form, setForm] = useState({ amount: "", code: "", recipientName: "", recipientEmail: "", senderName: "", message: "", note: "" });

  const issue = useMutation({
    mutationFn: async () =>
      apiRequest("/api/gift-cards", "POST", {
        amount: Number(form.amount),
        code: form.code.trim() || undefined,
        recipientName: form.recipientName.trim() || null,
        recipientEmail: form.recipientEmail.trim() || null,
        senderName: form.senderName.trim() || null,
        message: form.message.trim() || null,
        note: form.note.trim() || null,
      }),
    onSuccess: async (res: any) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/gift-cards"] });
      setIssueOpen(false);
      setForm({ amount: "", code: "", recipientName: "", recipientEmail: "", senderName: "", message: "", note: "" });
      toast({ title: "Gift card issued", description: `Code ${created.code} · ${money(created.balance)}` });
    },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to issue gift card") }),
  });

  const [adjustAmount, setAdjustAmount] = useState("");
  const patch = useMutation({
    mutationFn: async (body: any) => apiRequest(`/api/gift-cards/${selectedId}`, "PATCH", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gift-cards"] });
      queryClient.invalidateQueries({ queryKey: [`/api/gift-cards/${selectedId}`] });
      setAdjustAmount("");
      toast({ title: "Updated" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to update") }),
  });

  const runSearch = () => setDebounced(search.trim());
  const outstanding = cards.filter((c) => c.status === "active").reduce((s, c) => s + Number(c.balance), 0);
  const activeCount = cards.filter((c) => c.status === "active").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gift Cards</h1>
          <p className="text-muted-foreground mt-1">Issue prepaid cards customers can redeem at checkout.</p>
        </div>
        <Button onClick={() => setIssueOpen(true)} data-testid="button-issue-gift-card">
          <Plus className="mr-2 h-4 w-4" /> Issue gift card
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active cards</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding liability</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(outstanding)}</div>
            <p className="text-xs text-muted-foreground">Unspent balance customers can still redeem</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total issued</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{cards.length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All gift cards</CardTitle>
          <CardDescription>Click a card to see its history or adjust the balance.</CardDescription>
          <div className="flex gap-2 pt-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search code, recipient" value={search}
                onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()}
                data-testid="input-gift-card-search" />
            </div>
            <Button variant="outline" onClick={runSearch}>Search</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : cards.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No gift cards issued yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Initial</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelectedId(c.id)} data-testid={`row-gift-card-${c.id}`}>
                    <TableCell className="font-mono text-sm">{c.code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.recipientName || c.recipientEmail || "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{money(c.balance)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{money(c.initialBalance)}</TableCell>
                    <TableCell><Badge variant={statusVariant[c.status] || "outline"}>{c.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Issue dialog */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent data-testid="dialog-issue-gift-card">
          <DialogHeader>
            <DialogTitle>Issue a gift card</DialogTitle>
            <DialogDescription>A code is generated automatically unless you set one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gc-amount">Amount</Label>
                <Input id="gc-amount" type="number" min="0" step="0.01" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="input-gift-card-amount" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gc-code">Custom code (optional)</Label>
                <Input id="gc-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="Auto-generated" data-testid="input-gift-card-code" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gc-rname">Recipient name</Label>
                <Input id="gc-rname" value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gc-remail">Recipient email</Label>
                <Input id="gc-remail" type="email" value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gc-note">Internal note</Label>
              <Input id="gc-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Promo giveaway, comp for order #1234…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button onClick={() => issue.mutate()} disabled={!(Number(form.amount) > 0) || issue.isPending} data-testid="button-confirm-issue">
              {issue.isPending ? "Issuing…" : `Issue ${form.amount ? money(form.amount) : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-gift-card-detail">
          <DialogHeader>
            <DialogTitle className="font-mono">{detail?.card.code}</DialogTitle>
            <DialogDescription>
              {detail?.card.recipientName || detail?.card.recipientEmail || "No recipient on file"}
            </DialogDescription>
          </DialogHeader>
          {!detail ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Balance</div>
                  <div className="text-lg font-semibold">{money(detail.card.balance)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Initial</div>
                  <div className="text-lg font-semibold">{money(detail.card.initialBalance)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge variant={statusVariant[detail.card.status] || "outline"}>{detail.card.status}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor="gc-adjust" className="text-sm">Adjust balance ($, +/-)</Label>
                  <Input id="gc-adjust" type="number" step="0.01" className="w-40" value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)} data-testid="input-gift-card-adjust" />
                </div>
                <Button size="sm" variant="outline" disabled={!Number(adjustAmount) || patch.isPending}
                  onClick={() => patch.mutate({ adjustAmount: Number(adjustAmount) })} data-testid="button-gift-card-adjust">
                  Apply
                </Button>
                {detail.card.status === "active" ? (
                  <Button size="sm" variant="outline" onClick={() => patch.mutate({ status: "disabled" })} data-testid="button-gift-card-disable">
                    <Ban className="mr-1 h-4 w-4" /> Disable
                  </Button>
                ) : detail.card.status === "disabled" ? (
                  <Button size="sm" variant="outline" onClick={() => patch.mutate({ status: "active" })} data-testid="button-gift-card-enable">
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Re-enable
                  </Button>
                ) : null}
              </div>

              <div>
                <h3 className="mb-2 font-semibold">History</h3>
                {detail.transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {detail.transactions.map((tx) => (
                      <li key={tx.id} className="flex justify-between border-b py-1 last:border-0">
                        <span className="text-muted-foreground">{tx.note || tx.type}</span>
                        <span className={Number(tx.amount) >= 0 ? "text-primary" : "text-destructive"}>
                          {Number(tx.amount) >= 0 ? "+" : ""}{money(tx.amount)} → {money(tx.balanceAfter)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
