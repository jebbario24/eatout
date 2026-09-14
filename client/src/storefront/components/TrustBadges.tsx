import { Truck, RefreshCw, ShieldCheck, Headset, Sparkles } from "lucide-react";

const ICONS: Record<string, typeof Truck> = {
  truck: Truck,
  "refresh-cw": RefreshCw,
  "shield-check": ShieldCheck,
  headset: Headset,
};

export interface TrustBadgesFields {
  items: Array<{ icon: string; label: string; detail: string }>;
}

export function TrustBadges({ fields }: { fields: TrustBadgesFields }) {
  const items = fields.items || [];
  if (items.length === 0) return null;
  return (
    <div className="border-b bg-muted/30" data-testid="storefront-trust-badges">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 sm:px-6 md:grid-cols-4 lg:px-8">
        {items.map((item, i) => {
          const Icon = ICONS[item.icon] || Sparkles;
          return (
            <div key={i} className="flex items-center gap-2.5">
              <Icon className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium leading-tight">{item.label}</p>
                <p className="text-xs text-muted-foreground leading-tight">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
