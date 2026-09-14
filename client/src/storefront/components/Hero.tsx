import { Button } from "@/components/ui/button";

export interface HeroFields {
  backgroundImageUrl?: string | null;
  heading: string;
  subheading: string;
  buttonText: string;
  buttonStyle: "solid" | "outline";
  textAlign: "left" | "center" | "right";
  overlayOpacity: number;
}

export function Hero({ fields, shopHref }: { fields: HeroFields; shopHref: string }) {
  const alignClass = fields.textAlign === "center" ? "items-center text-center" : fields.textAlign === "right" ? "items-end text-right" : "items-start text-left";
  return (
    <div
      className="relative flex h-[60vh] min-h-[380px] w-full flex-col justify-end bg-cover bg-center px-6 pb-12 sm:px-10"
      style={fields.backgroundImageUrl ? { backgroundImage: `url(${fields.backgroundImageUrl})` } : { background: "linear-gradient(135deg, hsl(var(--primary)/0.85), hsl(var(--primary)/0.6))" }}
      data-testid="storefront-hero"
    >
      {fields.backgroundImageUrl && (
        <div className="absolute inset-0 bg-black" style={{ opacity: (fields.overlayOpacity ?? 20) / 100 }} />
      )}
      <div className={`relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-4 ${alignClass}`}>
        <h1 className="max-w-2xl font-display text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
          {fields.heading}
        </h1>
        {fields.subheading && (
          <p className="max-w-xl text-base text-white/90 sm:text-lg">{fields.subheading}</p>
        )}
        {fields.buttonText && (
          <a href={shopHref}>
            <Button
              size="lg"
              variant={fields.buttonStyle === "outline" ? "outline" : "default"}
              className={fields.buttonStyle === "outline" ? "border-white text-white hover:bg-white hover:text-black" : ""}
              data-testid="button-hero-cta"
            >
              {fields.buttonText}
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
