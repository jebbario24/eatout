import { Link } from "wouter";
import { SiInstagram, SiFacebook, SiTiktok, SiX } from "react-icons/si";
import { CreditCard } from "lucide-react";
import { useFooterPageGroups } from "@/storefront/lib/useFooterPages";

export interface FooterFields {
  showSocialLinks: boolean;
  showPaymentIcons: boolean;
}

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
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {(hasGroups || ungrouped.length > 0) && (
          <div className={`mb-12 grid grid-cols-2 gap-8 border-b border-background/20 pb-12 sm:grid-cols-3 ${hasGroups ? "md:grid-cols-4" : ""}`}>
            {Array.from(groups.entries()).map(([group, groupPages]) => (
              <div key={group}>
                <p className="mb-4 text-xs font-normal uppercase tracking-[0.14em] text-background/60">{group}</p>
                <ul className="space-y-2.5">
                  {groupPages.map((p) => (
                    <li key={p.id}>
                      <Link href={`${base}/pages/${p.handle}`} className="text-[13px] text-background/85 transition-colors hover:text-background">
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              {hasGroups && <p className="mb-4 text-xs font-normal uppercase tracking-[0.14em] text-background/60">More</p>}
              <ul className="space-y-2.5">
                {ungrouped.map((p) => (
                  <li key={p.id}>
                    <Link href={`${base}/pages/${p.handle}`} className="text-[13px] text-background/85 transition-colors hover:text-background">
                      {p.title}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={`${base}/contact`} className="text-[13px] text-background/85 transition-colors hover:text-background">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="font-sans text-base font-bold uppercase tracking-[0.14em]">{storeName}</p>
          {links.length > 0 && (
            <div className="flex items-center gap-4">
              {links.map((k) => {
                const Icon = SOCIAL_ICONS[k];
                return (
                  <a key={k} href={socialLinks![k]} target="_blank" rel="noopener noreferrer" className="text-background/70 transition-colors hover:text-background">
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-background/20 pt-8 text-xs text-background/70 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          {fields.showPaymentIcons && (
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Secure payments accepted</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
