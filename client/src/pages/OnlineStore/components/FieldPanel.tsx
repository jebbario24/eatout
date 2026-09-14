import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InlineImageUploader } from "@/components/InlineImageUploader";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { ThemeSection, ProductPageSettings, ContactPageSettings } from "@shared/schema";
import { TRUST_BADGE_ICONS } from "@/storefront/components/TrustBadges";

interface Collection {
  id: string;
  title: string;
  handle: string;
}

interface StorePage {
  id: string;
  title: string;
  handle: string;
}

const NAV_TYPES: Array<{ value: string; label: string }> = [
  { value: "home", label: "Home" },
  { value: "shop", label: "Shop" },
  { value: "contact", label: "Contact" },
  { value: "page", label: "A page you wrote" },
];

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

export function FieldPanel({ selectedKey, section, socialLinks, productPage, contactPage, onFieldsChange, onSocialLinksChange, onProductPageChange, onContactPageChange }: {
  selectedKey: string;
  section: ThemeSection | undefined;
  socialLinks: Record<string, string>;
  productPage: ProductPageSettings;
  contactPage: ContactPageSettings;
  // Keyed by `section.id || section.type` — plain `type` isn't unique once a
  // store can have more than one "customEmbed" section.
  onFieldsChange: (key: string, fields: Record<string, any>) => void;
  onSocialLinksChange: (links: Record<string, string>) => void;
  onProductPageChange: (patch: ProductPageSettings) => void;
  onContactPageChange: (patch: ContactPageSettings) => void;
}) {
  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
    enabled: selectedKey === "featuredProducts",
  });
  const { data: pages = [] } = useQuery<StorePage[]>({
    queryKey: ["/api/store/pages"],
    enabled: selectedKey === "header",
  });

  if (selectedKey === "social") {
    return (
      <div className="space-y-5 p-4">
        <h3 className="font-semibold">Social Links</h3>
        <p className="text-xs text-muted-foreground">
          Shown as icons in your footer when "Show social links" is on. Leave any blank to hide that icon.
        </p>
        {([
          ["instagram", "Instagram"],
          ["facebook", "Facebook"],
          ["tiktok", "TikTok"],
          ["twitter", "Twitter / X"],
        ] as const).map(([key, label]) => (
          <Field key={key} label={label}>
            <Input
              value={socialLinks[key] || ""}
              onChange={(e) => onSocialLinksChange({ ...socialLinks, [key]: e.target.value })}
              placeholder={`https://${key}.com/yourstore`}
              data-testid={`input-social-${key}`}
            />
          </Field>
        ))}
      </div>
    );
  }

  if (selectedKey === "productPage") {
    const setProductPage = (patch: ProductPageSettings) => onProductPageChange({ ...productPage, ...patch });
    return (
      <div className="space-y-5 p-4">
        <h3 className="font-semibold">Product Page</h3>
        <p className="text-xs text-muted-foreground">
          Every product page shares these settings. Its trust badges and newsletter block come from the Trust Badges and Newsletter sections above.
        </p>
        <Field label="Add to cart button text">
          <Input
            value={productPage.addToCartText || ""}
            onChange={(e) => setProductPage({ addToCartText: e.target.value })}
            placeholder="Add to cart"
            data-testid="input-product-add-to-cart-text"
          />
        </Field>
        <ToggleRow
          label="Show Buy Now button"
          checked={productPage.showBuyNow !== false}
          onChange={(v) => setProductPage({ showBuyNow: v })}
          testId="toggle-product-show-buy-now"
        />
        <ToggleRow
          label="Show wishlist icon (Adanola & Maison themes only)"
          checked={productPage.showWishlist !== false}
          onChange={(v) => setProductPage({ showWishlist: v })}
          testId="toggle-product-show-wishlist"
        />
        <Field label="Details accordion heading">
          <Input
            value={productPage.detailsHeading || ""}
            onChange={(e) => setProductPage({ detailsHeading: e.target.value })}
            placeholder="Details"
            data-testid="input-product-details-heading"
          />
        </Field>
        <Field label="Related products heading">
          <Input
            value={productPage.relatedHeading || ""}
            onChange={(e) => setProductPage({ relatedHeading: e.target.value })}
            placeholder="You may also like"
            data-testid="input-product-related-heading"
          />
        </Field>
        <Field label="Shipping & returns text (optional)">
          <Textarea
            value={productPage.shippingReturnsText || ""}
            onChange={(e) => setProductPage({ shippingReturnsText: e.target.value })}
            rows={5}
            placeholder="Orders ship within 1-2 business days. Free returns within 30 days of delivery."
            data-testid="input-product-shipping-returns"
          />
          <p className="text-xs text-muted-foreground">Shown in its own accordion on the product page. Leave blank to fall back to your Trust Badges' shipping/returns lines.</p>
        </Field>
        <ToggleRow
          label="Show About Us on product pages"
          checked={!!productPage.showAboutUs}
          onChange={(v) => setProductPage({ showAboutUs: v })}
          testId="toggle-product-show-about"
        />
        <p className="text-xs text-muted-foreground">Reuses the same About Us section content from above — set it up there first.</p>
      </div>
    );
  }

  if (selectedKey === "contactPage") {
    const setContactPage = (patch: ContactPageSettings) => onContactPageChange({ ...contactPage, ...patch });
    return (
      <div className="space-y-5 p-4">
        <h3 className="font-semibold">Contact Page</h3>
        <p className="text-xs text-muted-foreground">
          Its header and footer come from the Header and Footer sections above. Submitted messages land in your Inbox.
        </p>
        <Field label="Heading">
          <Input
            value={contactPage.heading || ""}
            onChange={(e) => setContactPage({ heading: e.target.value })}
            placeholder="Contact us"
            data-testid="input-contact-heading"
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={contactPage.description || ""}
            onChange={(e) => setContactPage({ description: e.target.value })}
            rows={3}
            placeholder="Have a question about an order or a product? Send us a message and we'll get back to you."
            data-testid="input-contact-description"
          />
        </Field>
        <Field label="Submit button text">
          <Input
            value={contactPage.submitButtonText || ""}
            onChange={(e) => setContactPage({ submitButtonText: e.target.value })}
            placeholder="Send message"
            data-testid="input-contact-submit-text"
          />
        </Field>
      </div>
    );
  }

  if (!section) {
    return <div className="p-4 text-sm text-muted-foreground">Select a section to edit its content.</div>;
  }

  const fields = section.fields || {};
  const set = (patch: Record<string, any>) => onFieldsChange(section.id || section.type, { ...fields, ...patch });

  return (
    <div className="space-y-5 p-4">
      <h3 className="font-semibold">{section.type === "aboutUs" ? "About Us" : section.type === "customEmbed" ? "Custom HTML" : section.type[0].toUpperCase() + section.type.slice(1).replace(/([A-Z])/g, " $1")}</h3>

      {section.type === "header" && (
        <>
          <ImageField label="Logo" value={fields.logoUrl} onChange={(url) => set({ logoUrl: url })} />
          <Field label="Announcement bar text (optional — themes with an announcement strip only)">
            <Input value={fields.announcementText || ""} onChange={(e) => set({ announcementText: e.target.value })} placeholder="FREE shipping on orders over $100" data-testid="input-header-announcement" />
          </Field>
          <ToggleRow label="Show search icon" checked={fields.showSearch} onChange={(v) => set({ showSearch: v })} testId="toggle-header-search" />
          <ToggleRow label="Show account icon" checked={fields.showAccount} onChange={(v) => set({ showAccount: v })} testId="toggle-header-account" />
          <ToggleRow label="Show cart icon" checked={fields.showCart} onChange={(v) => set({ showCart: v })} testId="toggle-header-cart" />

          <div className="space-y-2 border-t pt-4">
            <Label>Navigation links</Label>
            {(fields.nav || []).map((item: any, i: number) => {
              const nav = fields.nav || [];
              const updateItem = (patch: Record<string, any>) => {
                const next = [...nav];
                next[i] = { ...next[i], ...patch };
                set({ nav: next });
              };
              return (
                <div key={i} className="space-y-1.5 rounded-md border p-2.5">
                  <div className="flex items-center gap-1">
                    <Input
                      value={item.label}
                      placeholder="Link text"
                      onChange={(e) => updateItem({ label: e.target.value })}
                      data-testid={`input-nav-label-${i}`}
                    />
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                      disabled={i === 0}
                      onClick={() => { const next = [...nav]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; set({ nav: next }); }}
                      data-testid={`button-nav-up-${i}`}
                    ><ChevronUp className="h-3.5 w-3.5" /></Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                      disabled={i === nav.length - 1}
                      onClick={() => { const next = [...nav]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; set({ nav: next }); }}
                      data-testid={`button-nav-down-${i}`}
                    ><ChevronDown className="h-3.5 w-3.5" /></Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => set({ nav: nav.filter((_: any, j: number) => j !== i) })}
                      data-testid={`button-nav-remove-${i}`}
                    ><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <Select value={item.type} onValueChange={(v) => updateItem({ type: v, value: v === "page" ? (pages[0]?.handle || "") : undefined })}>
                    <SelectTrigger data-testid={`select-nav-type-${i}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NAV_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {item.type === "page" && (
                    <Select value={item.value || ""} onValueChange={(v) => updateItem({ value: v })}>
                      <SelectTrigger data-testid={`select-nav-page-${i}`}><SelectValue placeholder="Choose a page" /></SelectTrigger>
                      <SelectContent>
                        {pages.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No pages yet — write one in Pages first.</p>}
                        {pages.map((p) => <SelectItem key={p.id} value={p.handle}>{p.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}
            <Button
              variant="outline" size="sm" className="w-full"
              onClick={() => set({ nav: [...(fields.nav || []), { label: "New link", type: "home" }] })}
              data-testid="button-nav-add"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add link
            </Button>
          </div>
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
        <div className="space-y-3">
          {(fields.items || []).map((item: any, i: number) => (
            <div key={i} className="space-y-1.5 rounded-md border p-2.5">
              <div className="flex items-center gap-1">
                <Select
                  value={item.icon}
                  onValueChange={(v) => { const items = [...fields.items]; items[i] = { ...items[i], icon: v }; set({ items }); }}
                >
                  <SelectTrigger className="w-28 shrink-0" data-testid={`select-badge-icon-${i}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRUST_BADGE_ICONS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={item.label}
                  placeholder="Label"
                  onChange={(e) => {
                    const items = [...fields.items];
                    items[i] = { ...items[i], label: e.target.value };
                    set({ items });
                  }}
                  data-testid={`input-badge-label-${i}`}
                />
                <Button
                  variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => set({ items: fields.items.filter((_: any, j: number) => j !== i) })}
                  data-testid={`button-badge-remove-${i}`}
                ><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
              <Input
                value={item.detail}
                placeholder="Detail"
                onChange={(e) => {
                  const items = [...fields.items];
                  items[i] = { ...items[i], detail: e.target.value };
                  set({ items });
                }}
                data-testid={`input-badge-detail-${i}`}
              />
            </div>
          ))}
          <Button
            variant="outline" size="sm" className="w-full"
            onClick={() => set({ items: [...(fields.items || []), { icon: "truck", label: "New badge", detail: "" }] })}
            data-testid="button-badge-add"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add badge
          </Button>
        </div>
      )}

      {section.type === "featuredProducts" && (
        <>
          <Field label="Heading">
            <Input value={fields.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <Field label="Collection">
            <Select value={fields.collectionHandle || "__all__"} onValueChange={(v) => set({ collectionHandle: v === "__all__" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All products</SelectItem>
                {collections.map((c) => <SelectItem key={c.id} value={c.handle}>{c.title}</SelectItem>)}
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

      {section.type === "customEmbed" && (
        <>
          <p className="text-xs text-muted-foreground">
            Paste any HTML — a chat widget, a tracking pixel, an embedded video, a third-party form. Script tags run exactly as they would on a normal page.
          </p>
          <Field label="HTML / embed code">
            <Textarea
              value={fields.html || ""}
              onChange={(e) => set({ html: e.target.value })}
              rows={10}
              className="font-mono text-xs"
              placeholder='<iframe src="https://www.youtube.com/embed/..." />'
              data-testid="input-embed-html"
            />
          </Field>
          <ToggleRow label="Full width (no side padding)" checked={!!fields.fullBleed} onChange={(v) => set({ fullBleed: v })} testId="toggle-embed-fullbleed" />
        </>
      )}
    </div>
  );
}
