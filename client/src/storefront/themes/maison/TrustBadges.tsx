import { Sparkles } from "lucide-react";
import { TRUST_BADGE_ICONS, type TrustBadgesFields } from "@/storefront/components/TrustBadges";

const ICONS = Object.fromEntries(Object.entries(TRUST_BADGE_ICONS).map(([key, { Icon }]) => [key, Icon]));

export function TrustBadges({ fields }: { fields: TrustBadgesFields }) {
  const items = fields.items || [];
  if (items.length === 0) return null;
  return (
    <div className="bg-secondary/40" data-testid="storefront-trust-badges">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        {items.map((item, i) => {
          const Icon = ICONS[item.icon] || Sparkles;
          return (
            <div key={i} className="flex flex-col items-center gap-2.5 text-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background text-primary shadow-sm">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[13px] font-medium leading-tight text-foreground">{item.label}</p>
                <p className="text-xs leading-tight text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
