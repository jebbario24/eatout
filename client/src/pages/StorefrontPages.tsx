import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Eye, EyeOff, Mail, MailOpen } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const body = error.message.replace(/^\d+:\s*/, "");
    try { const p = JSON.parse(body); if (p?.message) return p.message; } catch { /* */ }
  }
  return fallback;
}

type PageRow = {
  id: string; title: string; handle: string; body: string | null;
  isPublished: boolean; showInFooter: boolean; footerGroup: string | null;
  sortOrder: number; seoTitle: string | null; seoDescription: string | null;
};

type ContactMessageRow = {
  id: string; name: string; email: string; subject: string | null; message: string;
  isRead: boolean; createdAt: string;
};

const blank = {
  title: "", handle: "", body: "", isPublished: false, showInFooter: true,
  footerGroup: "", sortOrder: 0, seoTitle: "", seoDescription: "",
};

export default function StorefrontPages() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });

  const { data: pages = [], isLoading } = useQuery<PageRow[]>({ queryKey: ["/api/store/pages"] });
  const { data: messages = [] } = useQuery<ContactMessageRow[]>({ queryKey: ["/api/store/contact-messages"] });

  const openCreate = () => { setEditId(null); setForm({ ...blank }); setDialogOpen(true); };
  const openEdit = (p: PageRow) => {
    setEditId(p.id);
    setForm({
      title: p.title, handle: p.handle, body: p.body || "",
      isPublished: p.isPublished, showInFooter: p.showInFooter, footerGroup: p.footerGroup || "",
      sortOrder: p.sortOrder, seoTitle: p.seoTitle || "", seoDescription: p.seoDescription || "",
    });
    setDialogOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, footerGroup: form.footerGroup.trim() || null };
      if (editId) return apiRequest(`/api/store/pages/${editId}`, "PATCH", payload);
      return apiRequest("/api/store/pages", "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/pages"] });
      setDialogOpen(false);
      toast({ title: editId ? "Page updated" : "Page created" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to save page") }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/store/pages/${id}`, "DELETE"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/store/pages"] }); toast({ title: "Deleted" }); },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to delete") }),
  });

  const toggleRead = useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => apiRequest(`/api/store/contact-messages/${id}`, "PATCH", { isRead }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/store/contact-messages"] }),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pages</h1>
        <p className="text-muted-foreground mt-1">Content pages like About, FAQ, Privacy Policy and Terms — shown in your storefront footer. The Contact form is built in and lives at /contact automatically.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>All pages</CardTitle>
            <CardDescription>Only published pages are visible to customers. Group pages under the same footer label to organize them into columns.</CardDescription>
          </div>
          <Button onClick={openCreate} data-testid="button-new-page">
            <Plus className="mr-2 h-4 w-4" /> New page
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : pages.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 h-8 w-8 opacity-40" />
              No pages yet — add a Privacy Policy, Terms of Service, or About page.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Handle</TableHead>
                  <TableHead>Footer group</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((p) => (
                  <TableRow key={p.id} data-testid={`row-page-${p.id}`}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">/pages/{p.handle}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.footerGroup || "—"}</TableCell>
                    <TableCell>
                      {p.isPublished ? (
                        <Badge variant="default"><Eye className="mr-1 h-3 w-3" />Published</Badge>
                      ) : (
                        <Badge variant="secondary"><EyeOff className="mr-1 h-3 w-3" />Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)} data-testid={`button-edit-page-${p.id}`}>Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => window.confirm(`Delete "${p.title}"?`) && del.mutate(p.id)} data-testid={`button-delete-page-${p.id}`}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact messages</CardTitle>
          <CardDescription>Submissions from your storefront's Contact page.</CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Mail className="mx-auto mb-3 h-8 w-8 opacity-40" />
              No messages yet.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`rounded-md border p-4 ${m.isRead ? "" : "bg-accent/40"}`} data-testid={`row-message-${m.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{m.subject || "(no subject)"}</p>
                      <p className="text-xs text-muted-foreground">{m.name} · {m.email} · {new Date(m.createdAt).toLocaleString()}</p>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => toggleRead.mutate({ id: m.id, isRead: !m.isRead })}
                      title={m.isRead ? "Mark unread" : "Mark read"}
                      data-testid={`button-toggle-read-${m.id}`}
                    >
                      {m.isRead ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{m.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto" data-testid="dialog-page">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit page" : "New page"}</DialogTitle>
            <DialogDescription>Write the content in Markdown — headings, bold, links, and lists are supported.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Privacy Policy" data-testid="input-page-title" />
              </div>
              <div className="space-y-1.5">
                <Label>Handle {editId && <span className="text-xs text-muted-foreground">(URL)</span>}</Label>
                <Input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="auto from title" className="font-mono text-sm" data-testid="input-page-handle" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Body (Markdown)</Label>
              <Textarea rows={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="font-mono text-sm" data-testid="input-page-body" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} data-testid="switch-page-published" />
                Published
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.showInFooter} onCheckedChange={(v) => setForm({ ...form, showInFooter: v })} data-testid="switch-page-footer" />
                Show in footer
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Footer group <span className="text-xs text-muted-foreground">(optional column label, e.g. "Legal")</span></Label>
                <Input value={form.footerGroup} onChange={(e) => setForm({ ...form, footerGroup: e.target.value })} placeholder="Legal" data-testid="input-page-footer-group" />
              </div>
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })} data-testid="input-page-sort-order" />
              </div>
            </div>

            <details className="rounded-md border p-3 text-sm">
              <summary className="cursor-pointer font-medium">Search engine listing</summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label>SEO title</Label>
                  <Input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} placeholder={form.title || "Page title"} data-testid="input-page-seo-title" />
                </div>
                <div className="space-y-1.5">
                  <Label>Meta description</Label>
                  <Textarea rows={2} value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} maxLength={320} data-testid="input-page-seo-description" />
                </div>
              </div>
            </details>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.title.trim() || save.isPending} data-testid="button-save-page">
              {save.isPending ? "Saving…" : editId ? "Save page" : "Create page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
