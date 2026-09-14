import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InlineImageUploader } from "@/components/InlineImageUploader";
import type { ThemeSection, ThemeSectionType } from "@shared/schema";

interface Collection {
  id: string;
  title: string;
}

async function getUploadParameters() {
  const response = await fetch("/api/objects/upload", { method: "POST", credentials: "include" });
  const data = await response.json();
  return { method: "PUT" as const, url: data.uploadURL, objectPath: data.objectPath };
}

function ImageField({ label, value, onChange }: { label: string; value: string | null | undefined; onChange: (url: string | null) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <InlineImageUploader
        currentImageUrl={value}
        onGetUploadParameters={getUploadParameters}
        onComplete={(result) => {
          const objectPath = result.successful?.[0]?.meta?.objectPath as string | undefined;
          if (objectPath) onChange(objectPath);
        }}
        onRemove={() => onChange(null)}
        note="Recommended: at least 1600px wide"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange, testId }: { label: string; checked: boolean; onChange: (v: boolean) => void; testId: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label className="font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} data-testid={testId} />
    </div>
  );
}

export function FieldPanel({ selectedKey, section, colors, onFieldsChange, onColorsChange }: {
  selectedKey: string;
  section: ThemeSection | undefined;
  colors: { primaryColor: string; secondaryColor: string; accentColor: string };
  onFieldsChange: (type: ThemeSectionType, fields: Record<string, any>) => void;
  onColorsChange: (colors: { primaryColor: string; secondaryColor: string; accentColor: string }) => void;
}) {
  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
    enabled: selectedKey === "featuredProducts",
  });

  if (selectedKey === "design") {
    return (
      <div className="space-y-5 p-4">
        <h3 className="font-semibold">Design &amp; Colors</h3>
        {([
          ["primaryColor", "Primary color"],
          ["secondaryColor", "Secondary color"],
          ["accentColor", "Accent color"],
        ] as const).map(([key, label]) => (
          <Field key={key} label={label}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colors[key]}
                onChange={(e) => onColorsChange({ ...colors, [key]: e.target.value })}
                className="h-9 w-12 shrink-0 cursor-pointer rounded border"
                data-testid={`input-color-${key}`}
              />
              <Input value={colors[key]} onChange={(e) => onColorsChange({ ...colors, [key]: e.target.value })} />
            </div>
          </Field>
        ))}
      </div>
    );
  }

  if (!section) {
    return <div className="p-4 text-sm text-muted-foreground">Select a section to edit its content.</div>;
  }

  const fields = section.fields || {};
  const set = (patch: Record<string, any>) => onFieldsChange(section.type, { ...fields, ...patch });

  return (
    <div className="space-y-5 p-4">
      <h3 className="font-semibold">{section.type === "aboutUs" ? "About Us" : section.type[0].toUpperCase() + section.type.slice(1).replace(/([A-Z])/g, " $1")}</h3>

      {section.type === "header" && (
        <>
          <ImageField label="Logo" value={fields.logoUrl} onChange={(url) => set({ logoUrl: url })} />
          <Field label="Announcement bar text (optional — themes with an announcement strip only)">
            <Input value={fields.announcementText || ""} onChange={(e) => set({ announcementText: e.target.value })} placeholder="FREE shipping on orders over $100" data-testid="input-header-announcement" />
          </Field>
          <ToggleRow label="Show search icon" checked={fields.showSearch} onChange={(v) => set({ showSearch: v })} testId="toggle-header-search" />
          <ToggleRow label="Show account icon" checked={fields.showAccount} onChange={(v) => set({ showAccount: v })} testId="toggle-header-account" />
          <ToggleRow label="Show cart icon" checked={fields.showCart} onChange={(v) => set({ showCart: v })} testId="toggle-header-cart" />
        </>
      )}

      {section.type === "hero" && (
        <>
          <ImageField label="Background image" value={fields.backgroundImageUrl} onChange={(url) => set({ backgroundImageUrl: url })} />
          <ImageField label="Second image (optional — split-hero themes only)" value={fields.secondaryImageUrl} onChange={(url) => set({ secondaryImageUrl: url })} />
          <Field label="Heading">
            <Input value={fields.heading || ""} onChange={(e) => set({ heading: e.target.value })} data-testid="input-hero-heading" />
          </Field>
          <Field label="Subheading">
            <Textarea value={fields.subheading || ""} onChange={(e) => set({ subheading: e.target.value })} rows={2} data-testid="input-hero-subheading" />
          </Field>
          <Field label="Button text">
            <Input value={fields.buttonText || ""} onChange={(e) => set({ buttonText: e.target.value })} data-testid="input-hero-button-text" />
          </Field>
          <Field label="Button style">
            <Select value={fields.buttonStyle || "solid"} onValueChange={(v) => set({ buttonStyle: v })}>
              <SelectTrigger data-testid="select-hero-button-style"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Text alignment">
            <Select value={fields.textAlign || "left"} onValueChange={(v) => set({ textAlign: v })}>
              <SelectTrigger data-testid="select-hero-text-align"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={`Overlay darkness — ${fields.overlayOpacity ?? 20}%`}>
            <Slider value={[fields.overlayOpacity ?? 20]} min={0} max={80} step={5} onValueChange={([v]) => set({ overlayOpacity: v })} />
          </Field>
        </>
      )}

      {section.type === "trustBadges" && (
        <div className="space-y-4">
          {(fields.items || []).map((item: any, i: number) => (
            <div key={i} className="space-y-1.5 rounded-md border p-2.5">
              <Input
                value={item.label}
                placeholder="Label"
                onChange={(e) => {
                  const items = [...fields.items];
                  items[i] = { ...items[i], label: e.target.value };
                  set({ items });
                }}
              />
              <Input
                value={item.detail}
                placeholder="Detail"
                onChange={(e) => {
                  const items = [...fields.items];
                  items[i] = { ...items[i], detail: e.target.value };
                  set({ items });
                }}
              />
            </div>
          ))}
        </div>
      )}

      {section.type === "featuredProducts" && (
        <>
          <Field label="Heading">
            <Input value={fields.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <Field label="Collection">
            <Select value={fields.collectionId || "__all__"} onValueChange={(v) => set({ collectionId: v === "__all__" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All products</SelectItem>
                {collections.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Number of products">
            <Input type="number" min={2} max={24} value={fields.limit ?? 8} onChange={(e) => set({ limit: Number(e.target.value) })} />
          </Field>
        </>
      )}

      {section.type === "bestSellers" && (
        <>
          <Field label="Heading">
            <Input value={fields.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <Field label="Number of products">
            <Input type="number" min={2} max={24} value={fields.limit ?? 4} onChange={(e) => set({ limit: Number(e.target.value) })} />
          </Field>
          <p className="text-xs text-muted-foreground">Products shown here are pulled live from items tagged "Bestseller" in your catalog.</p>
        </>
      )}

      {section.type === "banner" && (
        <>
          <ImageField label="Background image" value={fields.imageUrl} onChange={(url) => set({ imageUrl: url })} />
          <Field label="Heading">
            <Input value={fields.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <Field label="Button text">
            <Input value={fields.buttonText || ""} onChange={(e) => set({ buttonText: e.target.value })} />
          </Field>
          <Field label="Button link">
            <Input value={fields.buttonUrl || ""} onChange={(e) => set({ buttonUrl: e.target.value })} placeholder="/store/your-slug/products/..." />
          </Field>
        </>
      )}

      {section.type === "aboutUs" && (
        <>
          <ImageField label="Image" value={fields.imageUrl} onChange={(url) => set({ imageUrl: url })} />
          <Field label="Heading">
            <Input value={fields.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <Field label="Body">
            <Textarea value={fields.body || ""} onChange={(e) => set({ body: e.target.value })} rows={5} />
          </Field>
        </>
      )}

      {section.type === "testimonials" && (
        <>
          <Field label="Heading">
            <Input value={fields.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <p className="text-xs text-muted-foreground">Reviews are always pulled live from your real, published customer reviews — they can't be edited here.</p>
        </>
      )}

      {section.type === "newsletter" && (
        <>
          <Field label="Heading">
            <Input value={fields.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <Field label="Subheading">
            <Input value={fields.subheading || ""} onChange={(e) => set({ subheading: e.target.value })} />
          </Field>
        </>
      )}

      {section.type === "footer" && (
        <>
          <ToggleRow label="Show social links" checked={fields.showSocialLinks} onChange={(v) => set({ showSocialLinks: v })} testId="toggle-footer-social" />
          <ToggleRow label="Show payment icons" checked={fields.showPaymentIcons} onChange={(v) => set({ showPaymentIcons: v })} testId="toggle-footer-payment" />
        </>
      )}
    </div>
  );
}
