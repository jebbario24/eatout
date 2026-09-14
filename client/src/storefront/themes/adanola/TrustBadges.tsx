import { Truck, RefreshCw, ShieldCheck, Headset, Sparkles } from "lucide-react";
import type { TrustBadgesFields } from "@/storefront/components/TrustBadges";

const ICONS: Record<string, typeof Truck> = {
  truck: Truck,
  "refresh-cw": RefreshCw,
  "shield-check": ShieldCheck,
  headset: Headset,
};

export function TrustBadges({ fields }: { fields: TrustBadgesFields }) {
  const items = fields.items || [];
  if (items.length === 0) return null;
  return (
    <div className="border-b border-[hsl(var(--card-border))] bg-[hsl(var(--muted))]" data-testid="storefront-trust-badges">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-y-4 px-4 py-4 sm:px-6 md:grid-cols-4 md:gap-x-4 lg:px-8">
        {items.map((item, i) => {
          const Icon = ICONS[item.icon] || Sparkles;
          return (
            <div key={i} className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 shrink-0 text-foreground" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-medium leading-tight text-foreground">{item.label}</p>
                <p className="text-[11px] leading-tight text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
