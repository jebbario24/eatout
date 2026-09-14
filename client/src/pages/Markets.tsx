import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Globe, Pencil, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CURRENCIES, COUNTRIES } from "@/lib/countries-currencies";
import type { Merchant } from "@shared/schema";

// apiRequest throws `Error("<status>: <json-or-text body>")` on non-2xx responses.
function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const bodyText = error.message.replace(/^\d+:\s*/, "");
    try {
      const parsed = JSON.parse(bodyText);
      if (parsed?.message) return parsed.message;
    } catch {
      // body wasn't JSON — fall through to the fallback
    }
  }
  return fallback;
}

type MarketFromDB = {
  id: string;
  name: string;
  currency: string;
  conversionRate: string;
  taxRate: string | null;
  countries: string[];
  isActive: boolean;
};

type Market = {
  id: string;
  name: string;
  currency: string;
  conversionRate: string;
  taxRate: string;
  countries: string[];
  isActive: boolean;
};

function transformMarket(db: MarketFromDB): Market {
  return {
    id: db.id,
    name: db.name,
    currency: db.currency,
    conversionRate: db.conversionRate,
    taxRate: db.taxRate ?? "",
    countries: db.countries || [],
    isActive: db.isActive,
  };
}

const emptyForm = {
  name: "",
  currency: "USD",
  conversionRate: "1",
  taxRate: "",
  countries: [] as string[],
  isActive: true,
};

export default function Markets() {
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [countrySearch, setCountrySearch] = useState("");

  const { data: merchant } = useQuery<Merchant>({ queryKey: ["/api/merchants/me"] });

  const { data: marketsFromDB = [], isLoading } = useQuery<MarketFromDB[]>({
    queryKey: ["/api/markets"],
  });
  const markets = marketsFromDB.map(transformMarket);

  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      return await apiRequest("/api/markets", "POST", {
        ...data,
        taxRate: data.taxRate === "" ? null : data.taxRate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      setCreateOpen(false);
      setForm(emptyForm);
      toast({ title: "Success", description: "Market created successfully" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: extractErrorMessage(error, "Failed to create market") });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof emptyForm }) => {
      return await apiRequest(`/api/markets/${id}`, "PUT", {
        ...data,
        taxRate: data.taxRate === "" ? null : data.taxRate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      setEditingMarket(null);
      toast({ title: "Success", description: "Market updated successfully" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: extractErrorMessage(error, "Failed to update market") });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest(`/api/markets/${id}`, "PUT", { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: extractErrorMessage(error, "Failed to update market") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/markets/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      toast({ title: "Success", description: "Market deleted successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete market" });
    },
  });

  const openCreate = () => {
    setForm({ ...emptyForm, currency: merchant?.currency || "USD" });
    setCountrySearch("");
    setCreateOpen(true);
  };

  const openEdit = (market: Market) => {
    setEditingMarket(market);
    setForm({
      name: market.name,
      currency: market.currency,
      conversionRate: market.conversionRate,
      taxRate: market.taxRate,
      countries: market.countries,
      isActive: market.isActive,
    });
    setCountrySearch("");
  };

  const toggleCountry = (code: string) => {
    setForm((f) => ({
      ...f,
      countries: f.countries.includes(code) ? f.countries.filter((c) => c !== code) : [...f.countries, code],
    }));
  };

  const filteredCountries = COUNTRIES.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()));

  const dialogOpen = createOpen || !!editingMarket;
  const closeDialog = () => {
    setCreateOpen(false);
    setEditingMarket(null);
  };
  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Market name is required" });
      return;
    }
    if (editingMarket) {
      updateMutation.mutate({ id: editingMarket.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Markets</h1>
          <p className="text-muted-foreground mt-1">
            Show your storefront in different currencies for different regions
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-market">
          <Plus className="h-4 w-4 mr-2" />
          Add market
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Your markets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : markets.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No markets yet. Add one to show storefront prices in another currency.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Conversion rate</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Countries</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {markets.map((market) => (
                  <TableRow key={market.id} data-testid={`row-market-${market.id}`}>
                    <TableCell className="font-medium">{market.name}</TableCell>
                    <TableCell>{market.currency}</TableCell>
                    <TableCell>
                      1 {merchant?.currency || "USD"} = {market.conversionRate} {market.currency}
                    </TableCell>
                    <TableCell>
                      {market.taxRate ? `${market.taxRate}%` : <Badge variant="secondary">Default</Badge>}
                    </TableCell>
                    <TableCell>
                      {market.countries.length > 0 ? (
                        <Badge variant="outline">{market.countries.length} countries</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={market.isActive}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: market.id, isActive: checked })}
                        data-testid={`switch-active-${market.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(market)} data-testid={`button-edit-${market.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(market.id)}
                        data-testid={`button-delete-${market.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMarket ? "Edit market" : "Add market"}</DialogTitle>
            <DialogDescription>
              Prices are converted for display only, using the rate below — orders are still
              recorded and charged in your merchant's base currency ({merchant?.currency || "USD"}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="market-name">Name</Label>
              <Input
                id="market-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Europe"
                data-testid="input-market-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                <SelectTrigger data-testid="select-market-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="market-rate">Conversion rate</Label>
              <Input
                id="market-rate"
                type="number"
                step="0.000001"
                min="0"
                value={form.conversionRate}
                onChange={(e) => setForm((f) => ({ ...f, conversionRate: e.target.value }))}
                data-testid="input-market-rate"
              />
              <p className="text-xs text-muted-foreground">
                1 {merchant?.currency || "USD"} = {form.conversionRate || "0"} {form.currency}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="market-tax">Tax rate override (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="market-tax"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.taxRate}
                  onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
                  placeholder={`Default (${merchant?.taxRate || "0.00"}%)`}
                  data-testid="input-market-tax"
                />
                {form.taxRate !== "" && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, taxRate: "" }))}>
                    Use default
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Countries ({form.countries.length} selected)</Label>
              <Input
                placeholder="Search countries..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                data-testid="input-country-search"
              />
              <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
                {filteredCountries.map((c) => (
                  <label key={c.code} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                    <Checkbox
                      checked={form.countries.includes(c.code)}
                      onCheckedChange={() => toggleCountry(c.code)}
                      data-testid={`checkbox-country-${c.code}`}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Informational only — this doesn't restrict checkout.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="market-active">Active</Label>
              <Switch
                id="market-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                data-testid="switch-market-active"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-market">
              {editingMarket ? "Save changes" : "Create market"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
