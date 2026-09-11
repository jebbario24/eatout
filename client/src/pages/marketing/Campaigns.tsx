import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Send, Users, Mail, MessageSquare, ShoppingCart, RefreshCw } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const body = error.message.replace(/^\d+:\s*/, "");
    try { const p = JSON.parse(body); if (p?.message) return p.message; } catch { /* */ }
  }
  return fallback;
}
const money = (n: number | string) => `$${Number(n).toFixed(2)}`;

/* ============================ Segments tab ============================ */

const blankSegment = {
  name: "", description: "",
  rules: { minOrders: "", maxOrders: "", minLifetimeCents: "", lastOrderWithinDays: "", lastOrderBeforeDays: "", hasAccount: "any", hasLoyalty: "any" },
};

function SegmentsTab() {
  const { toast } = useToast();
  const { data: segments = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/segments"] });
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...blankSegment });
  const [preview, setPreview] = useState<{ count: number } | null>(null);

  const toApiRules = (r: any) => {
    const out: any = {};
    for (const k of ["minOrders", "maxOrders", "minLifetimeCents", "lastOrderWithinDays", "lastOrderBeforeDays"]) {
      if (r[k] !== "" && r[k] != null) out[k] = Number(r[k]);
    }
    if (r.hasAccount === "yes") out.hasAccount = true;
    if (r.hasAccount === "no") out.hasAccount = false;
    if (r.hasLoyalty === "yes") out.hasLoyalty = true;
    return out;
  };
  const fromApiRules = (r: any = {}) => ({
    minOrders: r.minOrders ?? "", maxOrders: r.maxOrders ?? "",
    minLifetimeCents: r.minLifetimeCents ?? "", lastOrderWithinDays: r.lastOrderWithinDays ?? "",
    lastOrderBeforeDays: r.lastOrderBeforeDays ?? "",
    hasAccount: r.hasAccount === true ? "yes" : r.hasAccount === false ? "no" : "any",
    hasLoyalty: r.hasLoyalty === true ? "yes" : "any",
  });

  const openCreate = () => { setEditId(null); setForm({ ...blankSegment }); setPreview(null); setOpen(true); };
  const openEdit = (s: any) => { setEditId(s.id); setForm({ name: s.name, description: s.description || "", rules: fromApiRules(s.rules) }); setPreview(null); setOpen(true); };

  const doPreview = useMutation({
    mutationFn: async () => apiRequest("/api/segments/preview", "POST", { rules: toApiRules(form.rules) }),
    onSuccess: async (r: any) => setPreview(await r.json()),
  });
  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, description: form.description, rules: toApiRules(form.rules) };
      return editId ? apiRequest(`/api/segments/${editId}`, "PATCH", payload) : apiRequest("/api/segments", "POST", payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/segments"] }); setOpen(false); toast({ title: editId ? "Segment updated" : "Segment created" }); },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to save segment") }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/segments/${id}`, "DELETE"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/segments"] }); toast({ title: "Deleted" }); },
  });
  const recompute = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/segments/${id}/recompute`, "POST"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/segments"] }); toast({ title: "Membership refreshed" }); },
  });

  const numField = (key: string, label: string, placeholder = "") => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={form.rules[key]} placeholder={placeholder}
        onChange={(e) => setForm({ ...form, rules: { ...form.rules, [key]: e.target.value } })} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} data-testid="button-new-segment"><Plus className="mr-2 h-4 w-4" />New segment</Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? <p className="py-6 text-center text-muted-foreground">Loading…</p> : segments.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No segments yet. Segments target campaigns at the right customers.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Members</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {segments.map((s) => (
                  <TableRow key={s.id} data-testid={`row-segment-${s.id}`}>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
                    </TableCell>
                    <TableCell className="text-right">{s.memberCount}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => recompute.mutate(s.id)} title="Refresh membership"><RefreshCw className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(s)}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => window.confirm(`Delete "${s.name}"?`) && del.mutate(s.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="dialog-segment">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit segment" : "New segment"}</DialogTitle>
            <DialogDescription>Customers are matched by their order history. Membership is recomputed on save.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Regulars, Lapsed, VIPs…" data-testid="input-segment-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {numField("minOrders", "Min orders")}
              {numField("maxOrders", "Max orders")}
              {numField("minLifetimeCents", "Min lifetime spend (¢)", "e.g. 10000 = $100")}
              {numField("lastOrderWithinDays", "Ordered in last N days")}
              {numField("lastOrderBeforeDays", "No order for N+ days")}
              <div className="space-y-1.5">
                <Label className="text-xs">Has an account</Label>
                <Select value={form.rules.hasAccount} onValueChange={(v) => setForm({ ...form, rules: { ...form.rules, hasAccount: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="any">Any</SelectItem><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => doPreview.mutate()} disabled={doPreview.isPending} data-testid="button-preview-segment">
                {doPreview.isPending ? "Checking…" : "Preview match count"}
              </Button>
              {preview && <span className="text-sm text-muted-foreground" data-testid="text-segment-preview">{preview.count} customer(s) match</span>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name.trim() || save.isPending} data-testid="button-save-segment">
              {save.isPending ? "Saving…" : "Save segment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================ Campaigns tab ============================ */

const blankCampaign = { name: "", type: "custom", channel: "email", subject: "", message: "", segmentId: "all", isActive: true };

function CampaignsTab() {
  const { toast } = useToast();
  const { data: campaigns = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/campaigns"] });
  const { data: segments = [] } = useQuery<any[]>({ queryKey: ["/api/segments"] });
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...blankCampaign });
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: detail } = useQuery<any>({ queryKey: [`/api/campaigns/${detailId}`], enabled: !!detailId });

  const openCreate = () => { setEditId(null); setForm({ ...blankCampaign }); setOpen(true); };
  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({ name: c.name, type: c.type, channel: c.channel, subject: c.subject || "", message: c.message, segmentId: c.segmentId || "all", isActive: c.isActive });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, segmentId: form.segmentId === "all" ? null : form.segmentId };
      return editId ? apiRequest(`/api/campaigns/${editId}`, "PATCH", payload) : apiRequest("/api/campaigns", "POST", payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] }); setOpen(false); toast({ title: editId ? "Campaign updated" : "Campaign created" }); },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to save campaign") }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/campaigns/${id}`, "DELETE"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] }); toast({ title: "Deleted" }); },
  });
  const send = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/campaigns/${id}/send`, "POST"),
    onSuccess: async (r: any) => {
      const run = await r.json();
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      if (detailId) queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${detailId}`] });
      toast({ title: "Campaign sent", description: `${run.sentCount} of ${run.recipientsCount} recipient(s)` });
    },
    onError: (e) => toast({ variant: "destructive", title: "Send failed", description: extractErrorMessage(e, "Could not send") }),
  });

  const channelIcon = (ch: string) => ch === "sms" ? <MessageSquare className="h-4 w-4" /> : <Mail className="h-4 w-4" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} data-testid="button-new-campaign"><Plus className="mr-2 h-4 w-4" />New campaign</Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? <p className="py-6 text-center text-muted-foreground">Loading…</p> : campaigns.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No campaigns yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Channel</TableHead><TableHead>Audience</TableHead><TableHead className="text-right">Sent</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id} data-testid={`row-campaign-${c.id}`}>
                    <TableCell>
                      <button className="font-medium hover:underline" onClick={() => setDetailId(c.id)}>{c.name}</button>
                      <div className="text-xs text-muted-foreground capitalize">{String(c.type).replace(/_/g, " ")}{!c.isActive && " · paused"}</div>
                    </TableCell>
                    <TableCell><span className="inline-flex items-center gap-1.5 capitalize">{channelIcon(c.channel)}{c.channel}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.segmentId ? (segments.find((s) => s.id === c.segmentId)?.name || "Segment") : "All customers"}</TableCell>
                    <TableCell className="text-right">{c.totalSent || 0}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" onClick={() => send.mutate(c.id)} disabled={send.isPending} data-testid={`button-send-campaign-${c.id}`}>
                        <Send className="mr-1 h-4 w-4" />Send now
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => window.confirm(`Delete "${c.name}"?`) && del.mutate(c.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-campaign">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit campaign" : "New campaign"}</DialogTitle>
            <DialogDescription>Use {"{{firstName}}"} and {"{{storeName}}"} in the subject or message.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-campaign-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger data-testid="select-campaign-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">One-off blast</SelectItem>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="reactivation">Win-back</SelectItem>
                    <SelectItem value="abandoned_cart">Abandoned cart</SelectItem>
                    <SelectItem value="birthday">Birthday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger data-testid="select-campaign-channel"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="push">Push</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={form.segmentId} onValueChange={(v) => setForm({ ...form, segmentId: v })}>
                <SelectTrigger data-testid="select-campaign-segment"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  {segments.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.memberCount})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.channel === "email" && (
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} data-testid="input-campaign-subject" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Hi {{firstName}}, we miss you at {{storeName}}!" data-testid="input-campaign-message" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              Active (triggered campaigns only run while active)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name.trim() || !form.message.trim() || save.isPending} data-testid="button-save-campaign">
              {save.isPending ? "Saving…" : "Save campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-campaign-detail">
          <DialogHeader>
            <DialogTitle>{detail?.campaign.name}</DialogTitle>
            <DialogDescription>{detail?.campaign.subject || "No subject"}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 text-sm whitespace-pre-wrap">{detail.campaign.message}</div>
              <div>
                <h3 className="mb-2 font-semibold">Send history</h3>
                {detail.runs.length === 0 ? <p className="text-sm text-muted-foreground">Never sent.</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Recipients</TableHead><TableHead className="text-right">Sent</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detail.runs.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{new Date(r.createdAt).toLocaleString()}</TableCell>
                          <TableCell><Badge variant={r.status === "completed" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                          <TableCell className="text-right">{r.recipientsCount}</TableCell>
                          <TableCell className="text-right">{r.sentCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              {detail.deliveries.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold">Recent deliveries</h3>
                  <ul className="space-y-1 text-sm">
                    {detail.deliveries.slice(0, 15).map((d: any) => (
                      <li key={d.id} className="flex justify-between border-b py-1 last:border-0">
                        <span className="text-muted-foreground">{d.toAddress || "—"}</span>
                        <Badge variant={d.status === "sent" ? "outline" : "destructive"} className="text-xs">{d.status}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {detail && <Button onClick={() => send.mutate(detail.campaign.id)} disabled={send.isPending}><Send className="mr-1 h-4 w-4" />Send now</Button>}
            <Button variant="outline" onClick={() => setDetailId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ======================= Abandoned carts tab ======================= */

function AbandonedTab() {
  const { data: carts = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/abandoned-carts"] });
  const open = carts.filter((c) => c.status === "open" || c.status === "reminded");
  const recovered = carts.filter((c) => c.status === "recovered");
  const recoveryRate = carts.length > 0 ? Math.round((recovered.length / carts.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Open carts</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{open.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Recovered</CardTitle><RefreshCw className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{recovered.length}</div><p className="text-xs text-muted-foreground">{recoveryRate}% recovery rate</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Value at risk</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{money(open.reduce((s, c) => s + Number(c.subtotal), 0))}</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Abandoned carts</CardTitle>
          <CardDescription>Create an active campaign of type "Abandoned cart" and idle carts get one reminder automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="py-6 text-center text-muted-foreground">Loading…</p> : carts.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No abandoned carts recorded yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead>Status</TableHead><TableHead>Last seen</TableHead></TableRow></TableHeader>
              <TableBody>
                {carts.map((c) => (
                  <TableRow key={c.id} data-testid={`row-cart-${c.id}`}>
                    <TableCell className="text-sm">{c.customerEmail || c.customerName || "Guest"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(c.items || []).map((i: any) => `${i.quantity}× ${i.name}`).join(", ")}</TableCell>
                    <TableCell className="text-right">{money(c.subtotal)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "recovered" ? "default" : c.status === "reminded" ? "secondary" : "outline"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(c.lastSeenAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================ Page ============================ */

export default function Campaigns() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campaigns</h1>
        <p className="text-muted-foreground mt-1">Reach the right customers by email, SMS or push — with segments and automated win-backs.</p>
      </div>
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns"><Send className="mr-1.5 h-4 w-4" />Campaigns</TabsTrigger>
          <TabsTrigger value="segments"><Users className="mr-1.5 h-4 w-4" />Segments</TabsTrigger>
          <TabsTrigger value="abandoned"><ShoppingCart className="mr-1.5 h-4 w-4" />Abandoned carts</TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns" className="mt-4"><CampaignsTab /></TabsContent>
        <TabsContent value="segments" className="mt-4"><SegmentsTab /></TabsContent>
        <TabsContent value="abandoned" className="mt-4"><AbandonedTab /></TabsContent>
      </Tabs>
    </div>
  );
}
