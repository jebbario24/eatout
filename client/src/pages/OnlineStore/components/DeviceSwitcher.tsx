import { Monitor, Tablet, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DeviceMode = "desktop" | "tablet" | "mobile";

export const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

export function DeviceSwitcher({ mode, onChange }: { mode: DeviceMode; onChange: (mode: DeviceMode) => void }) {
  const options: Array<{ mode: DeviceMode; icon: typeof Monitor; label: string }> = [
    { mode: "desktop", icon: Monitor, label: "Desktop" },
    { mode: "tablet", icon: Tablet, label: "Tablet" },
    { mode: "mobile", icon: Smartphone, label: "Mobile" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
      {options.map(({ mode: m, icon: Icon, label }) => (
        <Button
          key={m}
          type="button"
          size="icon"
          variant={mode === m ? "secondary" : "ghost"}
          className="h-8 w-8"
          onClick={() => onChange(m)}
          title={label}
          data-testid={`button-device-${m}`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}
