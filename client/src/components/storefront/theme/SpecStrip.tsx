import { ShieldCheck, Truck, Headset, Sparkles } from "lucide-react";

// A row of generic, non-fabricated trust signals — the "why buy from us" strip
// almost every real ecommerce homepage has right below the hero. Copy is
// deliberately generic (no specific policy numbers/thresholds we can't verify
// per-merchant, e.g. a dollar amount for free shipping).
const SPECS = [
  { icon: ShieldCheck, label: "Secure checkout" },
  { icon: Truck, label: "Fast fulfillment" },
  { icon: Headset, label: "Support, always on" },
  { icon: Sparkles, label: "Precision, every order" },
];

export interface SpecStripProps {
  // "light" is the default storefront's treatment (every business, every theme
  // unless overridden). "dark" is Nova's signature mono/dark treatment.
  variant?: "light" | "dark";
}

export function SpecStrip({ variant = "light" }: SpecStripProps) {
  const isDark = variant === "dark";
  return (
    <div className={isDark ? "bg-foreground text-background border-y" : "bg-muted/40 border-y"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {SPECS.map(({ icon: Icon, label }, i) => (
          <div key={i} className="flex items-center gap-3">
            <Icon className={`h-4 w-4 shrink-0 ${isDark ? "opacity-70" : "text-primary"}`} />
            <span
              className={
                isDark
                  ? "font-mono text-[11px] uppercase tracking-[0.15em] opacity-80"
                  : "text-sm font-medium"
              }
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
