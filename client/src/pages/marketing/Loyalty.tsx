import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Gift, Award, Coins, Sparkles } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

// apiRequest throws `Error("<status>: <json-or-text body>")` on non-2xx responses.
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

type TierBenefits = {
  description?: string;
  discountPercentage?: number;
  freeDelivery?: boolean;
} | null;

type LoyaltyTier = {
  id: string;
  name: string;
  minPoints: number;
  benefits: TierBenefits;
  displayOrder: number;
  isActive: boolean;
};

type LoyaltyProgram = {
  id: string;
  isEnabled: boolean;
  programName: string;
  pointsPerUnit: string;
  redeemCentsPerPoint: string;
  minRedeemPoints: number;
  maxRedeemFraction: string | null;
  earnOnDeliveryFee: boolean;
} | null;

type ProgramResponse = { program: LoyaltyProgram; tiers: LoyaltyTier[] } | null;

const emptyTierForm = {
  name: "",
  minPoints: 0,
  description: "",
  discountPercentage: 0,
  freeDelivery: false,
  isActive: true,
};

export default function Loyalty() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<ProgramResponse>({
    queryKey: ["/api/loyalty/program"],
  });

  const program = data?.program ?? null;
  const tiers = data?.tiers ?? [];

  // --- Program config form (local mirror, seeded from server) ---
  const [form, setForm] = useState({
    isEnabled: false,
    programName: "Rewards",
    pointsPerUnit: "1",
    redeemCentsPerPoint: "1",
    minRedeemPoints: 100,
    maxRedeemFraction: "0.5",
    earnOnDeliveryFee: false,
  });

  useEffect(() => {
    if (program) {
      setForm({
        isEnabled: program.isEnabled,
        programName: program.programName ?? "Rewards",
        pointsPerUnit: String(program.pointsPerUnit ?? "1"),
        redeemCentsPerPoint: String(program.redeemCentsPerPoint ?? "1"),
        minRedeemPoints: program.minRedeemPoints ?? 100,
        maxRedeemFraction: program.maxRedeemFraction != null ? String(program.maxRedeemFraction) : "0.5",
        earnOnDeliveryFee: program.earnOnDeliveryFee ?? false,
      });
    }
  }, [program]);

  const saveProgram = useMutation({
    mutationFn: async (patch: any) => apiRequest("/api/loyalty/program", "PUT", patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/program"] });
      toast({ title: "Saved", description: "Loyalty settings updated" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to save settings") }),
  });

  const handleSaveProgram = () => {
    const ppu = Number(form.pointsPerUnit);
    const rcpp = Number(form.redeemCentsPerPoint);
    if (!(ppu >= 0)) {
      toast({ variant: "destructive", title: "Invalid", description: "Points per $1 must be 0 or more" });
      return;
    }
    if (!(rcpp > 0)) {
      toast({ variant: "destructive", title: "Invalid", description: "Redeem value per point must be greater than 0" });
      return;
    }
    const frac = Number(form.maxRedeemFraction);
    if (!(frac >= 0 && frac <= 1)) {
      toast({ variant: "destructive", title: "Invalid", description: "Max redeem fraction must be between 0 and 1" });
      return;
    }
    saveProgram.mutate({
      isEnabled: form.isEnabled,
      programName: form.programName.trim() || "Rewards",
      pointsPerUnit: ppu,
      redeemCentsPerPoint: rcpp,
      minRedeemPoints: Math.max(0, Math.floor(Number(form.minRedeemPoints) || 0)),
      maxRedeemFraction: frac,
      earnOnDeliveryFee: form.earnOnDeliveryFee,
    });
  };

  // --- Tiers ---
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierForm, setTierForm] = useState({ ...emptyTierForm });

  const openCreateTier = () => {
    setEditingTierId(null);
    setTierForm({ ...emptyTierForm });
    setTierDialogOpen(true);
  };

  const openEditTier = (t: LoyaltyTier) => {
    setEditingTierId(t.id);
    setTierForm({
      name: t.name,
      minPoints: t.minPoints,
      description: t.benefits?.description ?? "",
      discountPercentage: t.benefits?.discountPercentage ?? 0,
      freeDelivery: t.benefits?.freeDelivery ?? false,
      isActive: t.isActive,
    });
    setTierDialogOpen(true);
  };

  const saveTier = useMutation({
    mutationFn: async () => {
      const payload = {
        name: tierForm.name.trim(),
        minPoints: Math.max(0, Math.floor(Number(tierForm.minPoints) || 0)),
        benefits: {
          description: tierForm.description.trim() || undefined,
          discountPercentage: Number(tierForm.discountPercentage) || undefined,
          freeDelivery: tierForm.freeDelivery || undefined,
        },
        isActive: tierForm.isActive,
      };
      if (editingTierId) return apiRequest(`/api/loyalty/tiers/${editingTierId}`, "PATCH", payload);
      return apiRequest("/api/loyalty/tiers", "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/program"] });
      setTierDialogOpen(false);
      toast({ title: "Saved", description: editingTierId ? "Tier updated" : "Tier created" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to save tier") }),
  });

  const deleteTier = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/loyalty/tiers/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/program"] });
      toast({ title: "Deleted", description: "Tier removed" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to delete tier") }),
  });

  const handleSaveTier = () => {
    if (!tierForm.name.trim()) {
      toast({ variant: "destructive", title: "Invalid", description: "Tier name is required" });
      return;
    }
    saveTier.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">Loading loyalty program…</div>
      </div>
    );
  }

  const centsPerPoint = Number(form.redeemCentsPerPoint) || 0;
  const exampleRedeem = form.minRedeemPoints > 0
    ? `${form.minRedeemPoints} points = $${((form.minRedeemPoints * centsPerPoint) / 100).toFixed(2)} off`
    : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Loyalty &amp; Rewards</h1>
          <p className="text-muted-foreground mt-1">
            Let customers earn points on every order and redeem them at checkout.
          </p>
        </div>
        <Badge variant={form.isEnabled ? "default" : "secondary"}>
          {form.isEnabled ? "Live" : "Off"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Program settings
          </CardTitle>
          <CardDescription>How points are earned and what they're worth.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="font-medium">Enable rewards</div>
              <div className="text-sm text-muted-foreground">
                When off, customers stop earning and the rewards widget is hidden at checkout.
              </div>
            </div>
            <Switch
              checked={form.isEnabled}
              onCheckedChange={(v) => setForm({ ...form, isEnabled: v })}
              data-testid="switch-loyalty-enabled"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="program-name">Program name</Label>
              <Input
                id="program-name"
                value={form.programName}
                onChange={(e) => setForm({ ...form, programName: e.target.value })}
                placeholder="Rewards"
                data-testid="input-program-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points-per-unit">Points earned per $1 spent</Label>
              <Input
                id="points-per-unit"
                type="number"
                min="0"
                step="0.5"
                value={form.pointsPerUnit}
                onChange={(e) => setForm({ ...form, pointsPerUnit: e.target.value })}
                data-testid="input-points-per-unit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redeem-value">Redeem value — cents off per point</Label>
              <Input
                id="redeem-value"
                type="number"
                min="0.0001"
                step="0.1"
                value={form.redeemCentsPerPoint}
                onChange={(e) => setForm({ ...form, redeemCentsPerPoint: e.target.value })}
                data-testid="input-redeem-value"
              />
              {exampleRedeem && (
                <p className="text-xs text-muted-foreground">{exampleRedeem}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-redeem">Minimum points to redeem</Label>
              <Input
                id="min-redeem"
                type="number"
                min="0"
                value={form.minRedeemPoints}
                onChange={(e) => setForm({ ...form, minRedeemPoints: Number(e.target.value) || 0 })}
                data-testid="input-min-redeem"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-fraction">Max share of an order paid with points</Label>
              <Input
                id="max-fraction"
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={form.maxRedeemFraction}
                onChange={(e) => setForm({ ...form, maxRedeemFraction: e.target.value })}
                data-testid="input-max-fraction"
              />
              <p className="text-xs text-muted-foreground">
                0.5 means points can cover at most half the item subtotal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="earn-delivery"
              checked={form.earnOnDeliveryFee}
              onCheckedChange={(v) => setForm({ ...form, earnOnDeliveryFee: v })}
              data-testid="switch-earn-delivery"
            />
            <Label htmlFor="earn-delivery">Also earn points on the delivery fee</Label>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProgram} disabled={saveProgram.isPending} data-testid="button-save-program">
              {saveProgram.isPending ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earn rate</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{form.pointsPerUnit} pt / $1</div>
            <p className="text-xs text-muted-foreground">On the item subtotal</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Point value</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{centsPerPoint}¢</div>
            <p className="text-xs text-muted-foreground">Discount per point redeemed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiers</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tiers.length}</div>
            <p className="text-xs text-muted-foreground">{tiers.filter((t) => t.isActive).length} active</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tiers</CardTitle>
            <CardDescription>Reward your best customers with status levels based on lifetime points.</CardDescription>
          </div>
          <Button onClick={openCreateTier} data-testid="button-create-tier">
            <Plus className="h-4 w-4 mr-2" /> Add tier
          </Button>
        </CardHeader>
        <CardContent>
          {tiers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tiers yet. Tiers are optional — points still work without them.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead>Unlocks at</TableHead>
                  <TableHead>Perks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...tiers]
                  .sort((a, b) => a.minPoints - b.minPoints)
                  .map((t) => (
                    <TableRow key={t.id} data-testid={`row-tier-${t.id}`}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.minPoints.toLocaleString()} lifetime pts</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[
                          t.benefits?.description,
                          t.benefits?.discountPercentage ? `${t.benefits.discountPercentage}% off` : null,
                          t.benefits?.freeDelivery ? "Free delivery" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.isActive ? "default" : "secondary"}>
                          {t.isActive ? "Active" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEditTier(t)} data-testid={`button-edit-tier-${t.id}`}>
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Delete tier "${t.name}"?`)) deleteTier.mutate(t.id);
                          }}
                          data-testid={`button-delete-tier-${t.id}`}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent data-testid="dialog-tier">
          <DialogHeader>
            <DialogTitle>{editingTierId ? "Edit tier" : "Add tier"}</DialogTitle>
            <DialogDescription>Customers reach a tier once their lifetime points cross its threshold.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tier-name">Tier name</Label>
              <Input
                id="tier-name"
                value={tierForm.name}
                onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                placeholder="e.g. Gold"
                data-testid="input-tier-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier-min">Unlocks at (lifetime points)</Label>
              <Input
                id="tier-min"
                type="number"
                min="0"
                value={tierForm.minPoints}
                onChange={(e) => setTierForm({ ...tierForm, minPoints: Number(e.target.value) || 0 })}
                data-testid="input-tier-min"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier-desc">Perk description (shown to customers)</Label>
              <Input
                id="tier-desc"
                value={tierForm.description}
                onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
                placeholder="e.g. Early access to new items"
                data-testid="input-tier-desc"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tier-discount">Standing discount %</Label>
                <Input
                  id="tier-discount"
                  type="number"
                  min="0"
                  max="100"
                  value={tierForm.discountPercentage}
                  onChange={(e) => setTierForm({ ...tierForm, discountPercentage: Number(e.target.value) || 0 })}
                  data-testid="input-tier-discount"
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch
                  id="tier-free-delivery"
                  checked={tierForm.freeDelivery}
                  onCheckedChange={(v) => setTierForm({ ...tierForm, freeDelivery: v })}
                  data-testid="switch-tier-free-delivery"
                />
                <Label htmlFor="tier-free-delivery">Free delivery</Label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="tier-active"
                checked={tierForm.isActive}
                onCheckedChange={(v) => setTierForm({ ...tierForm, isActive: v })}
                data-testid="switch-tier-active"
              />
              <Label htmlFor="tier-active">Active</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Note: tier perks are displayed to customers. Automatic application of tier discounts at checkout is coming in a later update.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTier} disabled={saveTier.isPending} data-testid="button-save-tier">
              {saveTier.isPending ? "Saving…" : "Save tier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
