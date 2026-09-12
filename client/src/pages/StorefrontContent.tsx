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
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Newspaper } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Markdown } from "@/components/Markdown";

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const body = error.message.replace(/^\d+:\s*/, "");
    try { const p = JSON.parse(body); if (p?.message) return p.message; } catch { /* */ }
  }
  return fallback;
}

/* --------------------------- Pages tab --------------------------- */

const blankPage = { title: "", handle: "", body: "", isPublished: false, showInFooter: false, seoTitle: "", seoDescription: "" };

function PagesTab() {
  const { toast } = useToast();
  const { data: pages = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/pages"] });
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...blankPage });
  const [showPreview, setShowPreview] = useState(false);

  const { data: editDetail } = useQuery<any>({ queryKey: [`/api/pages/${editId}`], enabled: !!editId });
  useEffect(() => {
    if (editId && editDetail) {
      setForm({
        title: editDetail.title, handle: editDetail.handle, body: editDetail.body || "",
        isPublished: editDetail.isPublished, showInFooter: editDetail.showInFooter,
        seoTitle: editDetail.seoTitle || "", seoDescription: editDetail.seoDescription || "",
      });
    }
  }, [editId, editDetail]);

  const openCreate = () => { setEditId(null); setForm({ ...blankPage }); setShowPreview(false); setOpen(true); };
  const openEdit = (id: string) => { setEditId(id); setShowPreview(false); setOpen(true); };

  const save = useMutation({
    mutationFn: async () => editId ? apiRequest(`/api/pages/${editId}`, "PATCH", form) : apiRequest("/api/pages", "POST", form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pages"] }); setOpen(false); toast({ title: editId ? "Page saved" : "Page created" }); },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to save page") }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/pages/${id}`, "DELETE"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pages"] }); toast({ title: "Deleted" }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} data-testid="button-new-page"><Plus className="mr-2 h-4 w-4" />New page</Button>
      </div>
      <Card><CardContent className="pt-6">
        {isLoading ? <p className="py-6 text-center text-muted-foreground">Loading…</p> : pages.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No pages yet. Add About, FAQ, Terms, Privacy…</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>URL</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {pages.map((p) => (
                <TableRow key={p.id} data-testid={`row-page-${p.id}`}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">/pages/{p.handle}</TableCell>
                  <TableCell><Badge variant={p.isPublished ? "default" : "secondary"}>{p.isPublished ? "Published" : "Draft"}</Badge>{p.showInFooter && <Badge variant="outline" className="ml-1">Footer</Badge>}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p.id)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => window.confirm(`Delete "${p.title}"?`) && del.mutate(p.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-page">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit page" : "New page"}</DialogTitle>
            <DialogDescription>Content is Markdown — # headings, **bold**, [links](/x), lists.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-page-title" /></div>
              <div className="space-y-1.5"><Label>Handle {editId && <span className="text-xs text-muted-foreground">(URL)</span>}</Label><Input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="auto from title" className="font-mono text-sm" data-testid="input-page-handle" /></div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Content</Label>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowPreview(!showPreview)}>{showPreview ? "Edit" : "Preview"}</Button>
              </div>
              {showPreview ? (
                <div className="min-h-[240px] rounded-md border p-4"><Markdown>{form.body || "_Nothing yet_"}</Markdown></div>
              ) : (
                <Textarea rows={12} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="font-mono text-sm" data-testid="input-page-body" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} data-testid="switch-page-published" />Published</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.showInFooter} onCheckedChange={(v) => setForm({ ...form, showInFooter: v })} data-testid="switch-page-footer" />Link in footer</label>
            </div>
            <details className="rounded-md border p-3 text-sm">
              <summary className="cursor-pointer font-medium">Search engine listing</summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5"><Label>SEO title</Label><Input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} placeholder={form.title} /></div>
                <div className="space-y-1.5"><Label>Meta description</Label><Textarea rows={2} value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} maxLength={320} /></div>
              </div>
            </details>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.title.trim() || save.isPending} data-testid="button-save-page">{save.isPending ? "Saving…" : "Save page"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --------------------------- Blog tab --------------------------- */

const blankPost = { title: "", handle: "", excerpt: "", body: "", coverImageUrl: "", author: "", tags: "", isPublished: false, seoTitle: "", seoDescription: "" };

function BlogTab() {
  const { toast } = useToast();
  const { data: posts = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/blog-posts"] });
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...blankPost });
  const [showPreview, setShowPreview] = useState(false);

  const { data: editDetail } = useQuery<any>({ queryKey: [`/api/blog-posts/${editId}`], enabled: !!editId });
  useEffect(() => {
    if (editId && editDetail) {
      setForm({
        title: editDetail.title, handle: editDetail.handle, excerpt: editDetail.excerpt || "",
        body: editDetail.body || "", coverImageUrl: editDetail.coverImageUrl || "", author: editDetail.author || "",
        tags: (editDetail.tags || []).join(", "), isPublished: editDetail.isPublished,
        seoTitle: editDetail.seoTitle || "", seoDescription: editDetail.seoDescription || "",
      });
    }
  }, [editId, editDetail]);

  const openCreate = () => { setEditId(null); setForm({ ...blankPost }); setShowPreview(false); setOpen(true); };
  const openEdit = (id: string) => { setEditId(id); setShowPreview(false); setOpen(true); };

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, tags: form.tags.split(",").map((s: string) => s.trim()).filter(Boolean) };
      return editId ? apiRequest(`/api/blog-posts/${editId}`, "PATCH", payload) : apiRequest("/api/blog-posts", "POST", payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/blog-posts"] }); setOpen(false); toast({ title: editId ? "Post saved" : "Post created" }); },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to save post") }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/blog-posts/${id}`, "DELETE"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/blog-posts"] }); toast({ title: "Deleted" }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} data-testid="button-new-post"><Plus className="mr-2 h-4 w-4" />New post</Button>
      </div>
      <Card><CardContent className="pt-6">
        {isLoading ? <p className="py-6 text-center text-muted-foreground">Loading…</p> : posts.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No posts yet.</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Published</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {posts.map((p) => (
                <TableRow key={p.id} data-testid={`row-post-${p.id}`}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "—"}</TableCell>
                  <TableCell><Badge variant={p.isPublished ? "default" : "secondary"}>{p.isPublished ? "Published" : "Draft"}</Badge></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p.id)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => window.confirm(`Delete "${p.title}"?`) && del.mutate(p.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-post">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit post" : "New post"}</DialogTitle>
            <DialogDescription>Content is Markdown.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-post-title" /></div>
              <div className="space-y-1.5"><Label>Handle</Label><Input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="auto from title" className="font-mono text-sm" data-testid="input-post-handle" /></div>
              <div className="space-y-1.5"><Label>Author</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Cover image URL</Label><Input value={form.coverImageUrl} onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Excerpt</Label><Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} maxLength={480} /></div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Content</Label>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowPreview(!showPreview)}>{showPreview ? "Edit" : "Preview"}</Button>
              </div>
              {showPreview ? (
                <div className="min-h-[240px] rounded-md border p-4"><Markdown>{form.body || "_Nothing yet_"}</Markdown></div>
              ) : (
                <Textarea rows={12} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="font-mono text-sm" data-testid="input-post-body" />
              )}
            </div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} data-testid="switch-post-published" />Published</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.title.trim() || save.isPending} data-testid="button-save-post">{save.isPending ? "Saving…" : "Save post"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function StorefrontContent() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pages &amp; Blog</h1>
        <p className="text-muted-foreground mt-1">Content pages and a blog for your storefront.</p>
      </div>
      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages"><FileText className="mr-1.5 h-4 w-4" />Pages</TabsTrigger>
          <TabsTrigger value="blog"><Newspaper className="mr-1.5 h-4 w-4" />Blog</TabsTrigger>
        </TabsList>
        <TabsContent value="pages" className="mt-4"><PagesTab /></TabsContent>
        <TabsContent value="blog" className="mt-4"><BlogTab /></TabsContent>
      </Tabs>
    </div>
  );
}
