import { SiInstagram, SiFacebook, SiTiktok, SiX } from "react-icons/si";
import { CreditCard } from "lucide-react";

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

export function Footer({ fields, storeName, socialLinks }: {
  fields: FooterFields;
  storeName: string;
  socialLinks?: Record<string, string> | null;
}) {
  const links = fields.showSocialLinks && socialLinks
    ? (Object.keys(SOCIAL_ICONS) as (keyof typeof SOCIAL_ICONS)[]).filter((k) => socialLinks[k])
    : [];
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-medium">{storeName}</p>
          {links.length > 0 && (
            <div className="flex items-center gap-3">
              {links.map((k) => {
                const Icon = SOCIAL_ICONS[k];
                return (
                  <a key={k} href={socialLinks![k]} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
        {fields.showPaymentIcons && (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Secure payments accepted</span>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">© {new Date().getFullYear()} {storeName}. Powered by EatOut.</p>
      </div>
    </footer>
  );
}
