import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Plus, Store, Users } from "lucide-react";
import { BoostedItemsBadge } from "@/components/marketing/storefront/BoostedItemsBadge";
import type { MenuItem } from "@shared/schema";
import type { StorefrontThemeId } from "@/lib/storefrontThemes";

const TAG_COLORS: Record<string, string> = {
  Bestseller: "bg-[hsl(38,92%,50%)] text-white border-transparent",
  New: "bg-[hsl(142,76%,36%)] text-white border-transparent",
  "Chef's Special": "bg-[hsl(221,83%,53%)] text-white border-transparent",
  Popular: "bg-[hsl(346,77%,50%)] text-white border-transparent",
  Spicy: "bg-[hsl(0,84%,60%)] text-white border-transparent",
  Vegetarian: "bg-[hsl(140,61%,45%)] text-white border-transparent",
  Vegan: "bg-[hsl(120,61%,50%)] text-white border-transparent",
  "Gluten-Free": "bg-[hsl(45,93%,47%)] text-white border-transparent",
  "Limited Time": "bg-[hsl(280,61%,50%)] text-white border-transparent",
};

export interface MenuItemCardProps {
  item: MenuItem;
  displayName: string;
  displayDescription?: string | null;
  cardStyle: "standard" | "bordered";
  // Optional full-theme flourish, orthogonal to cardStyle's boxed-vs-borderless
  // skeleton choice. undefined = today's exact rendering (no visual change).
  theme?: StorefrontThemeId | null;
  formattedPrice: string;
  isBoosted: boolean;
  scarcity?: { text: string } | null;
  socialProof?: { text: string } | null;
  onSelect: () => void;
  onAddToCart: (e: React.MouseEvent) => void;
}

function ImageAndBadges({ item, displayName, isBoosted }: { item: MenuItem; displayName: string; isBoosted: boolean }) {
  return (
    <>
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={displayName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <Store className="h-16 w-16 text-muted-foreground/50" />
        </div>
      )}

      <BoostedItemsBadge isBoosted={isBoosted} />

      {item.tags && item.tags.length > 0 && (
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          {item.tags.map((tag, idx) => (
            <Badge
              key={idx}
              className={`shadow-md text-xs font-semibold ${TAG_COLORS[tag] || "bg-muted text-foreground border-border"}`}
              data-testid={`badge-tag-${tag.toLowerCase().replace(/\s+/g, "-")}-${item.id}`}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {!item.isAvailable ? (
        <>
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Badge variant="destructive" className="text-sm">Out of Stock</Badge>
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="destructive" className="shadow-md" data-testid={`badge-out-of-stock-${item.id}`}>
              Out of Stock
            </Badge>
          </div>
        </>
      ) : item.stockCount !== null && item.stockCount !== undefined && item.stockCount < 10 ? (
        <div className="absolute top-2 right-2">
          <Badge
            className="shadow-md bg-[hsl(38,92%,50%)] text-white border-transparent hover:bg-[hsl(38,92%,45%)]"
            data-testid={`badge-low-stock-${item.id}`}
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Low Stock
          </Badge>
        </div>
      ) : null}
    </>
  );
}

function MarketingBadges({ item, scarcity, socialProof }: { item: MenuItem; scarcity?: { text: string } | null; socialProof?: { text: string } | null }) {
  if (!scarcity && !socialProof) return null;
  return (
    <div className="mt-2 space-y-2">
      {scarcity && (
        <Badge
          className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800"
          data-testid={`badge-scarcity-${item.id}`}
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          {scarcity.text}
        </Badge>
      )}
      {socialProof && (
        <Badge
          className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
          data-testid={`badge-social-proof-${item.id}`}
        >
          <Users className="h-3 w-3 mr-1" />
          {socialProof.text}
        </Badge>
      )}
    </div>
  );
}

export function MenuItemCard({
  item,
  displayName,
  displayDescription,
  cardStyle,
  theme,
  formattedPrice,
  isBoosted,
  scarcity,
  socialProof,
  onSelect,
  onAddToCart,
}: MenuItemCardProps) {
  // Always visible — this used to be `opacity-0 group-hover:opacity-100`, which meant
  // touch users (most storefront traffic) never saw an add-to-cart affordance at all.
  const addToCartButton = item.isAvailable && (
    <Button
      size="icon"
      className={theme === "wellness" ? "rounded-full" : theme === "editorial" ? "rounded-none" : undefined}
      variant={theme === "editorial" ? "ghost" : "default"}
      onClick={onAddToCart}
      data-testid={`button-add-to-cart-${item.id}`}
    >
      <Plus className="h-4 w-4" />
    </Button>
  );
  const imageRadius = theme === "fresh" ? "rounded-2xl" : theme === "editorial" ? "rounded-none" : "rounded-md";
  const hoverLift = theme ? { whileHover: { y: -4 }, transition: { duration: 0.2 } } : {};

  if (cardStyle === "bordered") {
    return (
      <motion.div {...hoverLift}>
        <Card
          className="overflow-hidden hover-elevate transition-all cursor-pointer group"
          onClick={onSelect}
          data-testid={`menu-item-${item.id}`}
        >
          <div className={`relative aspect-square ${theme === "fresh" ? "rounded-t-2xl overflow-hidden" : ""}`}>
            <ImageAndBadges item={item} displayName={displayName} isBoosted={isBoosted} />
          </div>
          <CardContent className="p-4">
            <h3 className={`font-bold text-lg mb-1 line-clamp-1 ${theme === "editorial" ? "font-serif font-normal" : ""}`}>{displayName}</h3>
            {displayDescription && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{displayDescription}</p>}
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-primary">{formattedPrice}</span>
              {addToCartButton}
            </div>
            <MarketingBadges item={item} scarcity={scarcity} socialProof={socialProof} />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // "standard": borderless, shadowless, image-first — matches the reference theme's default.
  return (
    <motion.div {...hoverLift} className="group cursor-pointer" onClick={onSelect} data-testid={`menu-item-${item.id}`}>
      <div className={`relative aspect-square overflow-hidden ${imageRadius} bg-muted`}>
        <ImageAndBadges item={item} displayName={displayName} isBoosted={isBoosted} />
      </div>
      <div className="pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className={`font-display font-semibold text-base leading-snug line-clamp-1 ${theme === "editorial" ? "font-serif font-normal" : ""}`}>{displayName}</h3>
          {addToCartButton}
        </div>
        {displayDescription && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{displayDescription}</p>}
        <span className="mt-1.5 block text-base font-semibold text-primary">{formattedPrice}</span>
        <MarketingBadges item={item} scarcity={scarcity} socialProof={socialProof} />
      </div>
    </motion.div>
  );
}
