import { useQuery } from "@tanstack/react-query";

export interface FooterPage {
  id: string;
  title: string;
  handle: string;
  showInFooter: boolean;
  footerGroup: string | null;
}

// Shared across every storefront theme's Footer: fetch this store's published
// pages and bucket the ones flagged `showInFooter` into named columns by their
// `footerGroup` (a null group renders as a flat, ungrouped list — see the
// column comment on `storefrontPages.footerGroup` in shared/schema.ts).
export function useFooterPageGroups(slug: string) {
  const { data: pages } = useQuery<FooterPage[]>({ queryKey: [`/api/storefront/${slug}/pages`] });
  const footerPages = (pages || []).filter((p) => p.showInFooter);

  const groups = new Map<string, FooterPage[]>();
  const ungrouped: FooterPage[] = [];
  for (const p of footerPages) {
    if (p.footerGroup) {
      if (!groups.has(p.footerGroup)) groups.set(p.footerGroup, []);
      groups.get(p.footerGroup)!.push(p);
    } else {
      ungrouped.push(p);
    }
  }
  return { groups, ungrouped, hasGroups: groups.size > 0 };
}
