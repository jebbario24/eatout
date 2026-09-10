import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface BoostedItemsBadgeProps {
  isBoosted: boolean;
}

export function BoostedItemsBadge({ isBoosted }: BoostedItemsBadgeProps) {
  if (!isBoosted) {
    return null;
  }

  return (
    <Badge 
      className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-transparent shadow-lg z-10"
      data-testid="badge-boosted"
    >
      <Zap className="h-3 w-3 mr-1 fill-white" />
      Featured
    </Badge>
  );
}
