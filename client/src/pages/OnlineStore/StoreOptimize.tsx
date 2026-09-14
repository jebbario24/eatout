import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Sparkles, CheckCircle2, Undo2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Restaurant } from "@shared/schema";

interface OptimizeChange {
  section: string;
  description: string;
}
interface OptimizeResult {
  id: string | null;
  changes: OptimizeChange[];
  message?: string;
}

export default function StoreOptimize() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: restaurant } = useQuery<Restaurant | null>({ queryKey: ["/api/restaurants/me"] });
  const [isRunning, setIsRunning] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [undone, setUndone] = useState(false);

  const runOptimize = async () => {
    setIsRunning(true);
    setResult(null);
    setUndone(false);
    try {
      const res = await apiRequest("/api/store/optimize", "POST");
      const data: OptimizeResult = await res.json();
      setResult(data);
      await queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
    } catch {
      toast({ variant: "destructive", title: "Optimization failed", description: "Please try again." });
    } finally {
      setIsRunning(false);
    }
  };

  const undo = async () => {
    if (!result?.id) return;
    setIsUndoing(true);
    try {
      await apiRequest(`/api/store/generations/${result.id}/undo`, "POST");
      setUndone(true);
      await queryClient.invalidateQueries({ queryKey: ["/api/restaurants/me"] });
      toast({ title: "Changes undone" });
    } catch {
      toast({ variant: "destructive", title: "Failed to undo", description: "Please try again." });
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/online-store"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-xl font-semibold">AI Store Optimization</h1>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2"><Sparkles className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="font-medium">Optimize my store</p>
              <p className="text-sm text-muted-foreground">
                Scans your catalog and reviews for real improvements — enabling sections that now qualify, filling in missing copy, and fixing color contrast. Nothing is fabricated; changes apply instantly and can be undone.
              </p>
            </div>
          </div>
          <Button onClick={runOptimize} disabled={isRunning} data-testid="button-run-optimize">
            {isRunning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing your store...</> : "Optimize My Store"}
          </Button>

          {result && (
            <div className="space-y-3 border-t pt-4">
              {result.changes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{result.message || "Your store is already optimized — nothing to change."}</p>
              ) : undone ? (
                <p className="text-sm text-muted-foreground">Changes were undone. Your store is back to how it was.</p>
              ) : (
                <>
                  <p className="text-sm font-medium">Applied {result.changes.length} change{result.changes.length === 1 ? "" : "s"}:</p>
                  <ul className="space-y-2">
                    {result.changes.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{c.description}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" onClick={undo} disabled={isUndoing} data-testid="button-undo-optimize">
                    {isUndoing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Undo2 className="mr-1.5 h-3.5 w-3.5" />}
                    Undo
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {restaurant?.slug && (
        <div className="mt-4 flex justify-end gap-4 text-sm">
          <a href="/online-store/editor" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Open Store Editor</a>
          <a href={`/store/${restaurant.slug}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            View live store
          </a>
        </div>
      )}
    </div>
  );
}
