/**
 * Minimal, dependency-free Markdown renderer for storefront CMS content.
 * Supports: headings, bold/italic, inline code, links, images, unordered and
 * ordered lists, blockquotes, horizontal rules, paragraphs and line breaks.
 * All text is HTML-escaped first, so the output is safe to dangerouslySetInnerHTML.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text: string): string {
  let t = escapeHtml(text);
  // images  ![alt](url)
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, url) =>
    /^https?:\/\/|^\//.test(url) ? `<img src="${url}" alt="${alt}" loading="lazy" />` : _m,
  );
  // links   [label](url)
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
    if (!/^https?:\/\/|^\/|^mailto:/.test(url)) return _m;
    const ext = /^https?:\/\//.test(url);
    return `<a href="${url}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
  });
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  t = t.replace(/_([^_]+)_/g, "<em>$1</em>");
  return t;
}

export function markdownToHtml(md: string): string {
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) { out.push(`</${listType}>`); listType = null; }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) { closeList(); i++; continue; }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { closeList(); out.push("<hr />"); i++; continue; }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    const ulItem = line.match(/^\s*[-*+]\s+(.*)$/);
    const olItem = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ulItem || olItem) {
      const want = ulItem ? "ul" : "ol";
      if (listType && listType !== want) closeList();
      if (!listType) { listType = want; out.push(`<${want}>`); }
      out.push(`<li>${inline((ulItem ? ulItem[1] : olItem![1]))}</li>`);
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      closeList();
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // paragraph — gather consecutive non-blank, non-structural lines
    closeList();
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^\s*[-*+]\s/.test(lines[i]) &&
      !/^\s*\d+\.\s/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${buf.map(inline).join("<br />")}</p>`);
  }
  closeList();
  return out.join("\n");
}

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={`sf-prose ${className || ""}`}
      dangerouslySetInnerHTML={{ __html: markdownToHtml(children) }}
    />
  );
}
