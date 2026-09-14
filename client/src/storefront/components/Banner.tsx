import { Button } from "@/components/ui/button";

export interface BannerFields {
  imageUrl?: string | null;
  heading: string;
  buttonText: string;
  buttonUrl: string;
}

export function Banner({ fields }: { fields: BannerFields }) {
  if (!fields.heading && !fields.imageUrl) return null;
  return (
    <div
      className="relative flex h-64 w-full items-center justify-center bg-cover bg-center text-center"
      style={fields.imageUrl ? { backgroundImage: `url(${fields.imageUrl})` } : { background: "linear-gradient(135deg, hsl(var(--accent)/0.3), hsl(var(--accent)/0.1))" }}
    >
      {fields.imageUrl && <div className="absolute inset-0 bg-black/30" />}
      <div className="relative z-10 space-y-3 px-4">
        {fields.heading && <h2 className={`font-display text-2xl font-bold sm:text-3xl ${fields.imageUrl ? "text-white" : ""}`}>{fields.heading}</h2>}
        {fields.buttonText && (
          <a href={fields.buttonUrl || "#"}>
            <Button>{fields.buttonText}</Button>
          </a>
        )}
      </div>
    </div>
  );
}
