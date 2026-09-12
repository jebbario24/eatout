import { motion } from "framer-motion";
import { GlassWater, Cake, Salad, Pizza, Coffee, Sandwich, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { MenuCategory, MenuItem } from "@shared/schema";

interface CategoryIconGridProps {
  categories: MenuCategory[];
  items: MenuItem[];
  onSelectCategory: (categoryId: string | null) => void;
}

const ICON_KEYWORDS: Array<{ match: RegExp; icon: LucideIcon }> = [
  { match: /drink|beverage|juice|soda/i, icon: GlassWater },
  { match: /dessert|sweet|cake|bake/i, icon: Cake },
  { match: /salad|veg|green/i, icon: Salad },
  { match: /pizza/i, icon: Pizza },
  { match: /coffee|tea/i, icon: Coffee },
  { match: /sandwich|burger|wrap/i, icon: Sandwich },
];

function iconForCategory(name: string): LucideIcon {
  const found = ICON_KEYWORDS.find((k) => k.match.test(name));
  return found?.icon || UtensilsCrossed;
}

// Data-bound round tile grid ("Shop by Category") — reuses the already-fetched
// categories/items, no new queries. Tapping a tile drives the existing category
// filter (setSelectedCategory), it doesn't reinvent it.
export function CategoryIconGrid({ categories, items, onSelectCategory }: CategoryIconGridProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h2 className="text-xl md:text-2xl font-display font-bold mb-6">Shop by Category</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {categories.map((category) => {
          const firstItemWithImage = items.find((i) => i.categoryId === category.id && i.imageUrl);
          const Icon = iconForCategory(category.name);
          return (
            <motion.button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="flex flex-col items-center gap-2 text-center group"
              data-testid={`category-tile-${category.id}`}
            >
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-muted overflow-hidden flex items-center justify-center border group-hover:border-primary transition-colors">
                {firstItemWithImage?.imageUrl ? (
                  <img src={firstItemWithImage.imageUrl} alt={category.name} className="h-full w-full object-cover" />
                ) : (
                  <Icon className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <span className="text-xs md:text-sm font-medium line-clamp-2">{category.name}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
