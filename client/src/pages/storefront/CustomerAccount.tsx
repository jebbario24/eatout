import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStorefrontCustomer } from "@/hooks/useStorefrontCustomer";
import { CustomerAuthDialog } from "@/components/storefront/CustomerAuthDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Package, MapPin, User as UserIcon, LogOut, Plus, Trash2, Loader2, RotateCcw, Star,
} from "lucide-react";

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

const money = (n: string | number) => `$${Number(n).toFixed(2)}`;
const statusColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  confirmed: "bg-primary/15 text-primary",
  preparing: "bg-primary/15 text-primary",
  ready: "bg-primary/15 text-primary",
  out_for_delivery: "bg-primary/15 text-primary",
  delivered: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-destructive/15 text-destructive",
};

export default function CustomerAccount() {
  const slug = useResolvedSlug();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { customer, isLoading, logout } = useStorefrontCustomer(slug);
  const [authOpen, setAuthOpen] = useState(false);

  const storeHref = slug ? `/store/${slug}` : "/";

  useEffect(() => {
    if (!isLoading && !customer && slug) setAuthOpen(true);
  }, [isLoading, customer, slug]);

  const ordersQ = useQuery<any[]>({
    queryKey: [`/api/storefront/${slug}/account/orders`],
    enabled: !!customer && !!slug,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}/account/orders`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const addressesQ = useQuery<any[]>({
    queryKey: [`/api/storefront/${slug}/account/addresses`],
    enabled: !!customer && !!slug,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}/account/addresses`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const reorder = useMutation({
    mutationFn: async (orderId: string) => {
      const r = await fetch(`/api/storefront/${slug}/account/orders/${orderId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Could not load that order");
      return r.json();
    },
    onSuccess: (data) => {
      try {
        const items = (data.items || [])
          .filter((it: any) => it.menuItem)
          .map((it: any) => ({
            menuItem: it.menuItem,
            quantity: it.quantity,
            selectedOptions: it.selectedOptions || [],
          }));
        sessionStorage.setItem(`sf_reorder_${slug}`, JSON.stringify(items));
      } catch {}
      setLocation(`${storeHref}?reorder=1`);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const addAddress = useMutation({
    mutationFn: async (body: any) => {
      const r = await fetch(`/api/storefront/${slug}/account/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Could not save address");
      return d;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/storefront/${slug}/account/addresses`] });
      setAddrForm(null);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const delAddress = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/storefront/${slug}/account/addresses/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/storefront/${slug}/account/addresses`] }),
  });

  const setDefaultAddr = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/storefront/${slug}/account/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isDefault: true }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/storefront/${slug}/account/addresses`] }),
  });

  const [addrForm, setAddrForm] = useState<null | { label: string; addressLine: string; city: string; country: string }>(null);

  // profile
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPw, setNewPw] = useState("");
  useEffect(() => {
    if (customer) { setName(customer.name || ""); setPhone(customer.phone || ""); }
  }, [customer]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/storefront/${slug}/account/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, phone, ...(newPw ? { password: newPw } : {}) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Could not save");
      return d;
    },
    onSuccess: (d) => {
      qc.setQueryData([`/api/storefront/${slug}/account/me`], d);
      setNewPw("");
      toast({ title: "Saved" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  if (isLoading || !slug) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <UserIcon className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Sign in to your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track orders, save addresses, and reorder in one tap.</p>
        <Button className="mt-6" onClick={() => setAuthOpen(true)}>Sign in or create account</Button>
        <div className="mt-3">
          <Link href={storeHref}><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Back to store</Button></Link>
        </div>
        <CustomerAuthDialog slug={slug} open={authOpen} onOpenChange={setAuthOpen} onAuthed={() => qc.invalidateQueries()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href={storeHref}>
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Back to store</Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => { await logout.mutateAsync(); setLocation(storeHref); }}
        >
          <LogOut className="mr-1 h-4 w-4" />Sign out
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Hi{customer.name ? `, ${customer.name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-muted-foreground">{customer.email}</p>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders"><Package className="mr-1.5 h-4 w-4" />Orders</TabsTrigger>
          <TabsTrigger value="addresses"><MapPin className="mr-1.5 h-4 w-4" />Addresses</TabsTrigger>
          <TabsTrigger value="profile"><UserIcon className="mr-1.5 h-4 w-4" />Profile</TabsTrigger>
        </TabsList>

        {/* ORDERS */}
        <TabsContent value="orders" className="mt-4 space-y-3">
          {ordersQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {ordersQ.data?.length === 0 && (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
              No orders yet. <Link href={storeHref} className="text-primary underline">Start shopping</Link>
            </CardContent></Card>
          )}
          {ordersQ.data?.map((o) => (
            <Card key={o.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">#{o.orderNumber}</span>
                    <Badge className={statusColor[o.status] || "bg-muted text-muted-foreground"} variant="secondary">
                      {String(o.status).replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString()} · {o.orderType} · {money(o.total)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reorder.isPending}
                  onClick={() => reorder.mutate(o.id)}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />Reorder
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ADDRESSES */}
        <TabsContent value="addresses" className="mt-4 space-y-3">
          {addressesQ.data?.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-start justify-between gap-3 py-4">
                <div className="text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    {a.label || "Address"}
                    {a.isDefault && <Badge variant="secondary" className="bg-primary/15 text-primary">Default</Badge>}
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    {a.addressLine}{a.city ? `, ${a.city}` : ""}{a.country ? `, ${a.country}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!a.isDefault && (
                    <Button size="icon" variant="ghost" title="Set as default" onClick={() => setDefaultAddr.mutate(a.id)}>
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" title="Delete" onClick={() => delAddress.mutate(a.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {addrForm ? (
            <Card><CardContent className="space-y-3 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Label</Label><Input value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} placeholder="Home" /></div>
                <div className="space-y-1.5"><Label>City</Label><Input value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Address</Label><Input value={addrForm.addressLine} onChange={(e) => setAddrForm({ ...addrForm, addressLine: e.target.value })} placeholder="Street, building, apt" /></div>
              <div className="space-y-1.5"><Label>Country</Label><Input value={addrForm.country} onChange={(e) => setAddrForm({ ...addrForm, country: e.target.value })} /></div>
              <div className="flex gap-2">
                <Button size="sm" disabled={!addrForm.addressLine.trim() || addAddress.isPending} onClick={() => addAddress.mutate(addrForm)}>Save address</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddrForm(null)}>Cancel</Button>
              </div>
            </CardContent></Card>
          ) : (
            <Button variant="outline" onClick={() => setAddrForm({ label: "", addressLine: "", city: "", country: "" })}>
              <Plus className="mr-1.5 h-4 w-4" />Add address
            </Button>
          )}
        </TabsContent>

        {/* PROFILE */}
        <TabsContent value="profile" className="mt-4">
          <Card><CardContent className="space-y-3 py-4">
            <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>New password <span className="text-muted-foreground">(leave blank to keep)</span></Label><Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} minLength={8} /></div>
            <Button size="sm" disabled={saveProfile.isPending} onClick={() => saveProfile.mutate()}>Save changes</Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
