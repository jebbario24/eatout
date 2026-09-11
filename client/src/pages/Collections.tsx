import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { MenuItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Layers, Search, Eye, EyeOff } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const body = error.message.replace(/^\d+:\s*/, "");
    try { const p = JSON.parse(body); if (p?.message) return p.message; } catch { /* */ }
  }
  return fallback;
}

type CollectionRow = {
  id: string; title: string; handle: string; description: string | null;
  isActive: boolean; showOnStorefront: boolean; sortOrder: number;
  seoTitle: string | null; seoDescription: string | null; itemCount: number;
};

const blank = {
  title: "", handle: "", description: "", isActive: true, showOnStorefront: true,
  sortOrder: 0, seoTitle: "", seoDescription: "", menuItemIds: [] as string[],
};

export default function Collections() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [picker, setPicker] = useState("");

  const { data: collections = [], isLoading } = useQuery<CollectionRow[]>({ queryKey: ["/api/collections"] });
  const { data: menuItems = [] } = useQuery<MenuItem[]>({ queryKey: ["/api/menu/items"], enabled: dialogOpen });

  const { data: editDetail } = useQuery<{ collection: CollectionRow; items: MenuItem[] }>({
    queryKey: [`/api/collections/${editId}`],
    enabled: !!editId,
  });

  useEffect(() => {
    if (editId && editDetail) {
      const c = editDetail.collection;
      setForm({
        title: c.title, handle: c.handle, description: c.description || "",
        isActive: c.isActive, showOnStorefront: c.showOnStorefront, sortOrder: c.sortOrder,
        seoTitle: c.seoTitle || "", seoDescription: c.seoDescription || "",
        menuItemIds: editDetail.items.map((i) => i.id),
      });
    }
  }, [editId, editDetail]);

  const openCreate = () => { setEditId(null); setForm({ ...blank }); setPicker(""); setDialogOpen(true); };
  const openEdit = (id: string) => { setEditId(id); setPicker(""); setDialogOpen(true); };

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form };
      if (editId) return apiRequest(`/api/collections/${editId}`, "PATCH", payload);
      return apiRequest("/api/collections", "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      if (editId) queryClient.invalidateQueries({ queryKey: [`/api/collections/${editId}`] });
      setDialogOpen(false);
      toast({ title: editId ? "Collection updated" : "Collection created" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to save collection") }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/collections/${id}`, "DELETE"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/collections"] }); toast({ title: "Deleted" }); },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to delete") }),
  });

  const filteredItems = useMemo(() => {
    const q = picker.trim().toLowerCase();
    return menuItems.filter((m) => !q || m.name.toLowerCase().includes(q));
  }, [menuItems, picker]);

  const toggleItem = (id: string) =>
    setForm((f) => ({
      ...f,
      menuItemIds: f.menuItemIds.includes(id) ? f.menuItemIds.filter((x) => x !== id) : [...f.menuItemIds, id],
    }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collections</h1>
          <p className="text-muted-foreground mt-1">Curated groups of products, shown as sections on your storefront.</p>
        </div>
        <Button onClick={openCreate} data-testid="button-new-collection">
          <Plus className="mr-2 h-4 w-4" /> New collection
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All collections</CardTitle>
          <CardDescription>Categories organise your menu; collections merchandise it (sales, seasonal, staff picks…).</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : collections.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Layers className="mx-auto mb-3 h-8 w-8 opacity-40" />
              No collections yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Handle</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead>Storefront</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((c) => (
                  <TableRow key={c.id} data-testid={`row-collection-${c.id}`}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">/c/{c.handle}</TableCell>
                    <TableCell className="text-right">{c.itemCount}</TableCell>
                    <TableCell>
                      {c.isActive && c.showOnStorefront ? (
                        <Badge variant="default"><Eye className="mr-1 h-3 w-3" />Visible</Badge>
                      ) : (
                        <Badge variant="secondary"><EyeOff className="mr-1 h-3 w-3" />Hidden</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(c.id)} data-testid={`button-edit-collection-${c.id}`}>Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => window.confirm(`Delete "${c.title}"?`) && del.mutate(c.id)} data-testid={`button-delete-collection-${c.id}`}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto" data-testid="dialog-collection">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit collection" : "New collection"}</DialogTitle>
            <DialogDescription>Pick the products, then choose where it shows.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Summer favourites" data-testid="input-collection-title" />
              </div>
              <div className="space-y-1.5">
                <Label>Handle {editId && <span className="text-xs text-muted-foreground">(URL)</span>}</Label>
                <Input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="auto from title" className="font-mono text-sm" data-testid="input-collection-handle" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-collection-description" />
            </div>

            <div className="space-y-2">
              <Label>Products ({form.menuItemIds.length})</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Filter products" value={picker} onChange={(e) => setPicker(e.target.value)} data-testid="input-collection-product-filter" />
              </div>
              <ScrollArea className="h-56 rounded-md border">
                <div className="p-1">
                  {filteredItems.map((m) => (
                    <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent" data-testid={`collection-pick-${m.id}`}>
                      <Checkbox checked={form.menuItemIds.includes(m.id)} onCheckedChange={() => toggleItem(m.id)} />
                      <span className="flex-1 truncate">{m.name}</span>
                      <span className="text-muted-foreground">${Number(m.price).toFixed(2)}</span>
                    </label>
                  ))}
                  {filteredItems.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted-foreground">No products</p>}
                </div>
              </ScrollArea>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} data-testid="switch-collection-active" />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.showOnStorefront} onCheckedChange={(v) => setForm({ ...form, showOnStorefront: v })} data-testid="switch-collection-storefront" />
                Show as a storefront section
              </label>
            </div>

            <details className="rounded-md border p-3 text-sm">
              <summary className="cursor-pointer font-medium">Search engine listing</summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label>SEO title</Label>
                  <Input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} placeholder={form.title || "Page title"} data-testid="input-collection-seo-title" />
                </div>
                <div className="space-y-1.5">
                  <Label>Meta description</Label>
                  <Textarea rows={2} value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} maxLength={320} data-testid="input-collection-seo-description" />
                </div>
              </div>
            </details>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.title.trim() || save.isPending} data-testid="button-save-collection">
              {save.isPending ? "Saving…" : editId ? "Save collection" : "Create collection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
