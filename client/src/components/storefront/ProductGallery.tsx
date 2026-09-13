import { useState } from "react";
import { Store } from "lucide-react";

export interface ProductGalleryProps {
  images: string[];
  alt: string;
}

// menuItems has only one imageUrl (no images array anywhere in the schema), but
// productVariants each carry their own imageUrl — so the gallery's slide list is
// built by the caller as [item.imageUrl, ...distinct variant.imageUrls]. Degrades to
// one static image (no thumbnail strip) when only one exists, which is the common
// case today for every existing merchant.
export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const shown = images[active] || images[0];

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
        <Store className="h-20 w-20 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
        <img src={shown} alt={alt} className="w-full h-full object-cover" data-testid="img-product-main" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`shrink-0 h-16 w-16 rounded-md overflow-hidden border-2 ${
                i === active ? "border-primary" : "border-transparent"
              }`}
              data-testid={`button-product-thumbnail-${i}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
