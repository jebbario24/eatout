import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Layers } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const body = error.message.replace(/^\d+:\s*/, "");
    try { const p = JSON.parse(body); if (p?.message) return p.message; } catch { /* */ }
  }
  return fallback;
}

type VariantRow = {
  id?: string;
  name: string;
  priceCents: number;
  sku: string;
  stockCount: string; // "" = untracked
  isActive: boolean;
};

const money = (cents: number) => (cents / 100).toFixed(2);

/**
 * Variant manager for a menu item (Tier 8). Purposefully lightweight: the merchant
 * names one option axis (e.g. "Size") and adds rows by hand rather than generating
 * a full combination matrix — fewer surprises, still covers the common case
 * (Small/Medium/Large, or a handful of SKUs) cleanly.
 */
export function VariantsEditor({ menuItemId }: { menuItemId?: string }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [optionName, setOptionName] = useState("");
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const { data } = useQuery<any>({
    queryKey: [`/api/menu/items/${menuItemId}/variants`],
    enabled: !!menuItemId,
  });

  useEffect(() => {
    if (data && !loaded) {
      const hasAny = (data.variants || []).length > 0;
      setEnabled(hasAny);
      setOptionName((data.optionNames || [])[0] || "");
      setRows(
        (data.variants || []).map((v: any) => ({
          id: v.id,
          name: v.name,
          priceCents: v.priceCents,
          sku: v.sku || "",
          stockCount: v.stockCount == null ? "" : String(v.stockCount),
          isActive: v.isActive,
        })),
      );
      setLoaded(true);
    }
  }, [data, loaded]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        optionNames: enabled && optionName.trim() ? [optionName.trim()] : [],
        variants: enabled
          ? rows.map((r) => ({
              id: r.id,
              name: r.name.trim(),
              options: optionName.trim() ? { [optionName.trim()]: r.name.trim() } : null,
              priceCents: r.priceCents,
              sku: r.sku.trim() || undefined,
              stockCount: r.stockCount === "" ? null : Number(r.stockCount),
              isActive: r.isActive,
            }))
          : [],
      };
      return apiRequest(`/api/menu/items/${menuItemId}/variants`, "PUT", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/menu/items/${menuItemId}/variants`] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu/items"] });
      toast({ title: "Variants saved" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: extractErrorMessage(e, "Failed to save variants") }),
  });

  const addRow = () => setRows([...rows, { name: "", priceCents: 0, sku: "", stockCount: "", isActive: true }]);
  const update = (i: number, patch: Partial<VariantRow>) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  if (!menuItemId) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        <div className="mb-1 flex items-center gap-2 font-medium text-foreground"><Layers className="h-4 w-4" />Variants</div>
        Save this item first, then reopen it to add variants (e.g. sizes with different prices and stock).
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold"><Layers className="h-4 w-4" />Variants</div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="switch-has-variants" />
          This product has variants
        </label>
      </div>

      {enabled && (
        <div className="space-y-3">
          <div className="space-y-1.5 max-w-xs">
            <Label className="text-xs">Option name (e.g. Size, Color)</Label>
            <Input value={optionName} onChange={(e) => setOptionName(e.target.value)} placeholder="Size" data-testid="input-variant-option-name" />
          </div>

          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.id || i} className="flex flex-wrap items-end gap-2 rounded-md border p-2" data-testid={`variant-row-${i}`}>
                <div className="space-y-1"><Label className="text-xs">{optionName || "Variant"} value</Label><Input className="w-32" value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Large" /></div>
                <div className="space-y-1"><Label className="text-xs">Price</Label>
                  <Input type="number" step="0.01" min="0" className="w-24" value={money(r.priceCents)}
                    onChange={(e) => update(i, { priceCents: Math.round((Number(e.target.value) || 0) * 100) })} />
                </div>
                <div className="space-y-1"><Label className="text-xs">SKU</Label><Input className="w-28" value={r.sku} onChange={(e) => update(i, { sku: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">Stock</Label><Input type="number" min="0" className="w-20" value={r.stockCount} onChange={(e) => update(i, { stockCount: e.target.value })} placeholder="∞" /></div>
                <label className="flex items-center gap-1.5 pb-2 text-xs">
                  <Switch checked={r.isActive} onCheckedChange={(v) => update(i, { isActive: v })} />Active
                </label>
                <Button size="icon" variant="ghost" className="mb-0.5" onClick={() => remove(i)} data-testid={`button-remove-variant-${i}`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addRow} data-testid="button-add-variant">
              <Plus className="mr-1.5 h-4 w-4" />Add variant
            </Button>
            {rows.length > 0 && <Badge variant="outline">{rows.length} variant{rows.length === 1 ? "" : "s"}</Badge>}
          </div>
        </div>
      )}

      <Button
        type="button"
        size="sm"
        onClick={() => save.mutate()}
        disabled={save.isPending || (enabled && rows.some((r) => !r.name.trim()))}
        data-testid="button-save-variants"
      >
        {save.isPending ? "Saving…" : "Save variants"}
      </Button>
    </div>
  );
}
