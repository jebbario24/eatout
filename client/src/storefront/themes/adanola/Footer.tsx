import { Link } from "wouter";
import { SiInstagram, SiFacebook, SiTiktok, SiX } from "react-icons/si";
import { useFooterPageGroups } from "@/storefront/lib/useFooterPages";
import type { FooterFields } from "@/storefront/components/Footer";

const SOCIAL_ICONS: Record<string, typeof SiInstagram> = {
  instagram: SiInstagram,
  facebook: SiFacebook,
  tiktok: SiTiktok,
  twitter: SiX,
};

export function Footer({ fields, storeName, socialLinks, slug }: {
  fields: FooterFields;
  storeName: string;
  socialLinks?: Record<string, string> | null;
  slug: string;
}) {
  const base = `/store/${slug}`;
  const { groups, ungrouped, hasGroups } = useFooterPageGroups(slug);

  const links = fields.showSocialLinks && socialLinks
    ? (Object.keys(SOCIAL_ICONS) as (keyof typeof SOCIAL_ICONS)[]).filter((k) => socialLinks[k])
    : [];

  return (
    <footer className="border-t border-[hsl(var(--card-border))] bg-background text-foreground">
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
        {(hasGroups || ungrouped.length > 0) && (
          <div className={`mb-8 grid grid-cols-2 gap-6 sm:grid-cols-3 ${hasGroups ? "md:grid-cols-4" : ""}`}>
            {Array.from(groups.entries()).map(([group, groupPages]) => (
              <div key={group}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-foreground">{group}</p>
                <ul className="space-y-2">
                  {groupPages.map((p) => (
                    <li key={p.id}>
                      <Link href={`${base}/pages/${p.handle}`} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              {hasGroups && <p className="mb-3 text-xs font-bold uppercase tracking-wide text-foreground">More</p>}
              <ul className="space-y-2">
                {ungrouped.map((p) => (
                  <li key={p.id}>
                    <Link href={`${base}/pages/${p.handle}`} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                      {p.title}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={`${base}/contact`} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-4 border-t border-[hsl(var(--card-border))] pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          {links.length > 0 && (
            <div className="flex items-center gap-3">
              {links.map((k) => {
                const Icon = SOCIAL_ICONS[k];
                return (
                  <a key={k} href={socialLinks![k]} target="_blank" rel="noopener noreferrer" className="text-foreground transition-opacity hover:opacity-60">
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
