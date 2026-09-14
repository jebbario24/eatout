import { Truck, RefreshCw, ShieldCheck, Headset, Package, Star, Gift, Clock, Sparkles } from "lucide-react";

export const TRUST_BADGE_ICONS: Record<string, { Icon: typeof Truck; label: string }> = {
  truck: { Icon: Truck, label: "Truck" },
  "refresh-cw": { Icon: RefreshCw, label: "Returns" },
  "shield-check": { Icon: ShieldCheck, label: "Security" },
  headset: { Icon: Headset, label: "Support" },
  package: { Icon: Package, label: "Package" },
  star: { Icon: Star, label: "Star" },
  gift: { Icon: Gift, label: "Gift" },
  clock: { Icon: Clock, label: "Clock" },
};

const ICONS: Record<string, typeof Truck> = Object.fromEntries(
  Object.entries(TRUST_BADGE_ICONS).map(([key, { Icon }]) => [key, Icon]),
);

export interface TrustBadgesFields {
  items: Array<{ icon: string; label: string; detail: string }>;
}

export function TrustBadges({ fields }: { fields: TrustBadgesFields }) {
  const items = fields.items || [];
  if (items.length === 0) return null;
  return (
    <div className="border-b border-border" data-testid="storefront-trust-badges">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-6 px-4 py-8 sm:px-6 md:grid-cols-4 md:gap-x-6 lg:px-8">
        {items.map((item, i) => {
          const Icon = ICONS[item.icon] || Sparkles;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border">
                <Icon className="h-4 w-4 text-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[13px] font-medium leading-tight">{item.label}</p>
                <p className="text-xs leading-tight text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
