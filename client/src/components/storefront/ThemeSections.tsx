import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import type { ThemeSection, ThemeColorScheme } from "@/lib/themeSections";

function colorSchemeClasses(scheme: ThemeColorScheme | undefined): string {
  switch (scheme) {
    case "primary":
      return "bg-primary text-primary-foreground";
    case "secondary":
      return "bg-secondary text-secondary-foreground";
    case "accent":
      return "bg-accent text-accent-foreground";
    default:
      return "bg-background text-foreground";
  }
}

const heightClasses: Record<string, string> = {
  small: "h-64",
  medium: "h-96",
  large: "h-[32rem]",
};

const positionClasses: Record<string, string> = {
  "top-left": "items-start justify-start text-left",
  "top-center": "items-start justify-center text-center",
  "top-right": "items-start justify-end text-right",
  "middle-left": "items-center justify-start text-left",
  "middle-center": "items-center justify-center text-center",
  "middle-right": "items-center justify-end text-right",
  "bottom-left": "items-end justify-start text-left",
  "bottom-center": "items-end justify-center text-center",
  "bottom-right": "items-end justify-end text-right",
};

interface BannerSlide {
  imageUrl?: string;
  heading?: string;
  text?: string;
  buttonLabel?: string;
  buttonUrl?: string;
}

function BannerSlideContent({ slide, height }: { slide: BannerSlide; height: string }) {
  return (
    <div
      className={`relative w-full ${heightClasses[height] || heightClasses.medium} bg-cover bg-center flex items-center justify-center text-center`}
      style={slide.imageUrl ? { backgroundImage: `url(${slide.imageUrl})` } : { background: "linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--primary)/0.05))" }}
    >
      {slide.imageUrl && <div className="absolute inset-0 bg-black/30" />}
      <div className={`relative z-10 max-w-lg p-8 space-y-4 ${slide.imageUrl ? "text-white" : ""}`}>
        {slide.heading && <h2 className="text-3xl md:text-4xl font-display font-bold">{slide.heading}</h2>}
        {slide.text && <p className="text-base md:text-lg opacity-90">{slide.text}</p>}
        {slide.buttonLabel && (
          <a href={slide.buttonUrl || "#"}>
            <Button size="lg">{slide.buttonLabel}</Button>
          </a>
        )}
      </div>
    </div>
  );
}

function ImageBannerSection({ section }: { section: ThemeSection }) {
  const s = section.settings;
  const slides: BannerSlide[] = [
    { imageUrl: s.imageUrl, heading: s.heading, text: s.text, buttonLabel: s.buttonLabel, buttonUrl: s.buttonUrl },
    ...section.blocks.filter((b) => b.type === "slide").map((b) => b.settings as BannerSlide),
  ];

  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api || slides.length <= 1) return;
    const interval = setInterval(() => api.scrollNext(), 5000);
    return () => clearInterval(interval);
  }, [api, slides.length]);

  // Single slide (every current merchant, until they add more): identical markup to
  // before this feature existed — same positioned layout, no Carousel wrapper.
  if (slides.length <= 1) {
    return (
      <div
        className={`relative w-full ${heightClasses[s.height] || heightClasses.medium} bg-cover bg-center flex ${positionClasses[s.contentPosition] || positionClasses["middle-center"]}`}
        style={s.imageUrl ? { backgroundImage: `url(${s.imageUrl})` } : { background: "linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--primary)/0.05))" }}
      >
        {s.imageUrl && <div className="absolute inset-0 bg-black/30" />}
        <div className={`relative z-10 max-w-lg p-8 space-y-4 ${s.imageUrl ? "text-white" : ""}`}>
          {s.heading && <h2 className="text-3xl md:text-4xl font-display font-bold">{s.heading}</h2>}
          {s.text && <p className="text-base md:text-lg opacity-90">{s.text}</p>}
          {s.buttonLabel && (
            <a href={s.buttonUrl || "#"}>
              <Button size="lg">{s.buttonLabel}</Button>
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <Carousel setApi={setApi} opts={{ loop: true }} className="relative">
      <CarouselContent className="ml-0">
        {slides.map((slide, i) => (
          <CarouselItem key={i} className="pl-0">
            <BannerSlideContent slide={slide} height={s.height} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-4" />
      <CarouselNext className="right-4" />
    </Carousel>
  );
}

function ImageWithTextSection({ section }: { section: ThemeSection }) {
  const s = section.settings;
  const imageFirst = s.layout !== "image-right";
  const justify = s.contentPosition === "top" ? "justify-start" : s.contentPosition === "bottom" ? "justify-end" : "justify-center";
  const image = (
    <div className="aspect-video md:aspect-square rounded-lg overflow-hidden bg-muted">
      {s.imageUrl ? (
        <img src={s.imageUrl} alt={s.heading || ""} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5" />
      )}
    </div>
  );
  const text = (
    <div className={`flex flex-col ${justify} space-y-4`}>
      {s.heading && <h2 className="text-2xl md:text-3xl font-display font-bold">{s.heading}</h2>}
      {s.text && <p className="text-muted-foreground">{s.text}</p>}
      {s.buttonLabel && (
        <a href={s.buttonUrl || "#"} className="w-fit">
          <Button>{s.buttonLabel}</Button>
        </a>
      )}
    </div>
  );
  return (
    <div className={`${colorSchemeClasses(s.colorScheme)} py-12`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-8 items-center">
        {imageFirst ? (
          <>
            {image}
            {text}
          </>
        ) : (
          <>
            {text}
            {image}
          </>
        )}
      </div>
    </div>
  );
}

function MulticolumnSection({ section }: { section: ThemeSection }) {
  const s = section.settings;
  const columns = Number(s.columns) || 3;
  return (
    <div className={`${colorSchemeClasses(s.colorScheme)} py-12`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {s.heading && <h2 className="text-2xl md:text-3xl font-display font-bold text-center">{s.heading}</h2>}
        <div className={`grid grid-cols-2 gap-6`} style={{ gridTemplateColumns: `repeat(${Math.min(columns, 4)}, minmax(0, 1fr))` }}>
          {section.blocks.map((block) => (
            <div key={block.id} className="text-center space-y-2">
              {block.settings.imageUrl ? (
                <img src={block.settings.imageUrl} alt="" className="h-12 w-12 mx-auto object-contain" />
              ) : block.settings.icon ? (
                <div className="text-3xl">{block.settings.icon}</div>
              ) : null}
              {block.settings.title && <p className="font-semibold">{block.settings.title}</p>}
              {block.settings.text && <p className="text-sm text-muted-foreground">{block.settings.text}</p>}
              {block.settings.linkLabel && (
                <a href={block.settings.linkUrl || "#"} className="text-sm underline">
                  {block.settings.linkLabel}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RichTextSection({ section }: { section: ThemeSection }) {
  const s = section.settings;
  return (
    <div className={`${colorSchemeClasses(s.colorScheme)} py-12`}>
      <div className="max-w-2xl mx-auto px-4 text-center space-y-4">
        {s.heading && <h2 className="text-2xl md:text-3xl font-display font-bold">{s.heading}</h2>}
        {s.text && <p className="text-muted-foreground">{s.text}</p>}
        {s.buttonLabel && (
          <a href={s.buttonUrl || "#"}>
            <Button>{s.buttonLabel}</Button>
          </a>
        )}
      </div>
    </div>
  );
}

function NewsletterSection({ section }: { section: ThemeSection }) {
  const s = section.settings;
  const { toast } = useToast();
  return (
    <div className={`${colorSchemeClasses(s.colorScheme)} py-12`}>
      <div className="max-w-md mx-auto px-4 text-center space-y-4">
        {s.heading && <h2 className="text-2xl md:text-3xl font-display font-bold">{s.heading}</h2>}
        {s.text && <p className="opacity-90">{s.text}</p>}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            toast({ title: "Thanks for subscribing!" });
            e.currentTarget.reset();
          }}
        >
          <Input type="email" placeholder="Enter your email" required className="bg-background text-foreground" />
          <Button type="submit">Subscribe</Button>
        </form>
      </div>
    </div>
  );
}

function TestimonialsSection({ section }: { section: ThemeSection }) {
  const s = section.settings;
  const cols = Math.min(section.blocks.length || 1, 3);
  return (
    <div className={`${colorSchemeClasses(s.colorScheme)} py-12`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {s.heading && <h2 className="text-2xl md:text-3xl font-display font-bold text-center">{s.heading}</h2>}
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {section.blocks.map((block) => (
            <div key={block.id} className="rounded-lg border bg-background/50 p-6 space-y-3">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < (block.settings.rating || 5) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                ))}
              </div>
              {block.settings.quote && <p className="italic text-sm">"{block.settings.quote}"</p>}
              {block.settings.customerName && <p className="font-semibold text-sm">{block.settings.customerName}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ThemeSections({ sections }: { sections: ThemeSection[] }) {
  return (
    <>
      {sections.filter((section) => section.enabled !== false).map((section) => {
        switch (section.type) {
          case "image-banner":
            return <ImageBannerSection key={section.id} section={section} />;
          case "image-with-text":
            return <ImageWithTextSection key={section.id} section={section} />;
          case "multicolumn":
            return <MulticolumnSection key={section.id} section={section} />;
          case "rich-text":
            return <RichTextSection key={section.id} section={section} />;
          case "newsletter":
            return <NewsletterSection key={section.id} section={section} />;
          case "testimonials":
            return <TestimonialsSection key={section.id} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
