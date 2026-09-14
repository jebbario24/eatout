import { useEffect, useRef } from "react";

export interface CustomEmbedFields {
  html: string;
  fullBleed?: boolean;
}

// Shared by every storefront theme — a merchant's own HTML/script snippet
// (chat widgets, trackers, iframes, third-party embeds) has no theme-specific
// look to speak of, so unlike other sections this has no Farfetch/Adanola
// variant; the theme registry points both entries at this one component.
export function CustomEmbed({ fields }: { fields: CustomEmbedFields }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container || !fields.html) return;
    container.innerHTML = fields.html;
    // innerHTML never executes <script> tags — recreate each one so embed
    // snippets that rely on inline or external scripts (chat widgets,
    // analytics, init code for an iframe) actually run, the same way a real
    // "custom HTML" block works on other site builders.
    const scripts = Array.from(container.querySelectorAll("script"));
    for (const old of scripts) {
      const fresh = document.createElement("script");
      for (const attr of Array.from(old.attributes)) fresh.setAttribute(attr.name, attr.value);
      fresh.text = old.textContent || "";
      old.replaceWith(fresh);
    }
  }, [fields.html]);

  if (!fields.html?.trim()) return null;
  return (
    <div
      className={fields.fullBleed ? "w-full" : "mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"}
      data-testid="section-custom-embed"
    >
      <div ref={ref} />
    </div>
  );
}
