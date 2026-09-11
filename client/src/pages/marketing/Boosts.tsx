import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Zap, TrendingUp, Clock } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const body = error.message.replace(/^\d+:\s*/, "");
    try { const p = JSON.parse(body); if (p?.message) return p.message; } catch { /* */ }
  }
  return fallback;
}

const slotLabels: Record<string, string> = {
  home_featured: "Homepage featured",
  category_top: "Top of category",
  search_priority: "Search priority",
};

export default function Boosts() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/boosts"] });
  const [open, setOpen] = useState(false);
  const [slotType, setSlotType] = useState("home_featured");
  const [hours, setHours] = useState("4");

  const credits = data?.credits;
  const slots: any[] = data?.slots || [];
  const now = Date.now();
  const active = slots.filter((s) => s.status === "active" && new Date(s.endsAt).getTime() > now);
  const past = slots.filter((s) => !active.includes(s));

  const start = useMutation({
    mutationFn: async () => apiRequest("/api/boosts", "POST", { slotType, hours: Number(hours) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/boosts"] }); setOpen(false); toast({ title: "Boost started" }); },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to start boost") }),
  });
  const cancel = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/boosts/${id}`, "DELETE"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/boosts"] }); toast({ title: "Boost cancelled" }); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Boosts</h1>
          <p className="text-muted-foreground mt-1">Spend a daily free credit to feature your store more prominently.</p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!credits || credits.creditsBalance < 1} data-testid="button-start-boost">
          <Zap className="mr-2 h-4 w-4" />Start a boost
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Credits available</CardTitle><Zap className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-boost-credits">{isLoading ? "…" : credits?.creditsBalance ?? 0}</div>
            <p className="text-xs text-muted-foreground">{credits?.dailyAllowance ?? 1} free per day</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active boosts</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{active.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total run</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{slots.length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Boost history</CardTitle><CardDescription>Active boosts show your store in the chosen placement until they expire.</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? <p className="py-6 text-center text-muted-foreground">Loading…</p> : slots.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No boosts yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Placement</TableHead><TableHead>Started</TableHead><TableHead>Ends</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {[...active, ...past].map((s) => {
                  const isActive = active.includes(s);
                  return (
                    <TableRow key={s.id} data-testid={`row-boost-${s.id}`}>
                      <TableCell className="font-medium">{slotLabels[s.slotType] || s.slotType}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(s.startedAt).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(s.endsAt).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : s.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {isActive && <Button size="sm" variant="outline" onClick={() => cancel.mutate(s.id)}>Cancel</Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="dialog-start-boost">
          <DialogHeader>
            <DialogTitle>Start a boost</DialogTitle>
            <DialogDescription>Uses 1 credit. You have {credits?.creditsBalance ?? 0}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Placement</Label>
              <Select value={slotType} onValueChange={setSlotType}>
                <SelectTrigger data-testid="select-boost-slot"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="home_featured">Homepage featured</SelectItem>
                  <SelectItem value="category_top">Top of category</SelectItem>
                  <SelectItem value="search_priority">Search priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger data-testid="select-boost-hours"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => start.mutate()} disabled={start.isPending} data-testid="button-confirm-boost">
              {start.isPending ? "Starting…" : "Start boost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
