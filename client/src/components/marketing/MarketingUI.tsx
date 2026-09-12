import { useState } from "react";
import { useMotionValue, useSpring, motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Store, Menu, Mail } from "lucide-react";
import { Link } from "wouter";

/** A pill button whose position eases toward the cursor when hovered — the "magnetic" feel. */
function useMagnetic(strength = 0.35) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });

  return {
    style: { x: springX, y: springY },
    onMouseMove: (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      x.set((e.clientX - rect.left - rect.width / 2) * strength);
      y.set((e.clientY - rect.top - rect.height / 2) * strength);
    },
    onMouseLeave: () => {
      x.set(0);
      y.set(0);
    },
  };
}

export function PrimaryPill({
  children,
  onClick,
  className = "",
  testId,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  testId?: string;
}) {
  const magnetic = useMagnetic();
  return (
    <motion.button
      onClick={onClick}
      onMouseMove={magnetic.onMouseMove}
      onMouseLeave={magnetic.onMouseLeave}
      style={magnetic.style}
      whileTap={{ scale: 0.96 }}
      data-testid={testId}
      className={`group inline-flex items-center justify-center gap-2 rounded-full bg-[#008060] px-6 py-3 text-[16px] font-medium text-white shadow-sm hover:bg-[#006e52] transition-colors ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function GhostPill({
  children,
  onClick,
  className = "",
  testId,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  testId?: string;
}) {
  const magnetic = useMagnetic();
  return (
    <motion.button
      onClick={onClick}
      onMouseMove={magnetic.onMouseMove}
      onMouseLeave={magnetic.onMouseLeave}
      style={magnetic.style}
      whileTap={{ scale: 0.96 }}
      data-testid={testId}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-black/20 bg-transparent px-6 py-3 text-[16px] font-medium text-[#1a1a1a] transition-colors hover:border-black/40 hover:bg-black/5 ${className}`}
    >
      {children}
    </motion.button>
  );
}

const NAV_LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Documentation", href: "/docs" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
];

/** Shared sticky nav bar used by the landing page and every marketing/content page,
 *  so the site reads as one connected product instead of six one-off pages. */
export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50 px-3 pt-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-xl border border-[#e3e3e3] bg-[#ffffff]/90 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-[#ffffff]/70">
        <Link href="/" className="flex shrink-0 items-center gap-2" data-testid="link-home-logo">
          <Store className="h-5 w-5 text-[#008060]" />
          <span className="text-lg font-semibold tracking-tight text-[#1a1a1a]">EatOut</span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3.5 py-2 text-[14px] font-medium text-[#6d7175] hover:text-[#1a1a1a] transition-colors"
              data-testid={`link-nav-${link.label.toLowerCase()}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <button
            onClick={() => (window.location.href = "/login")}
            className="text-[14px] font-medium text-[#6d7175] hover:text-[#1a1a1a] transition-colors"
            data-testid="button-login-header"
          >
            Login
          </button>
          <PrimaryPill onClick={() => (window.location.href = "/signup")} className="px-4 py-2 text-[14px]" testId="button-nav-cta">
            Get Started
          </PrimaryPill>
        </div>

        <div className="lg:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[#1a1a1a]"
                data-testid="button-mobile-menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-[#ffffff] border-[#e3e3e3] text-[#1a1a1a]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-[#1a1a1a]">
                  <Store className="h-5 w-5 text-[#008060]" />
                  EatOut
                </SheetTitle>
              </SheetHeader>

              <div className="mt-8 space-y-6">
                <div className="space-y-1">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-left py-2 text-[14px] font-medium text-[#6d7175] hover:text-[#1a1a1a]"
                      data-testid={`mobile-link-${link.label.toLowerCase()}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="space-y-1 pt-6 border-t border-[#e3e3e3]">
                  <button
                    onClick={() => {
                      window.location.href = "/login";
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-2 text-[14px] font-medium text-[#6d7175] hover:text-[#1a1a1a]"
                    data-testid="mobile-button-login"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = "/contact";
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-2 text-[14px] font-medium text-[#6d7175] hover:text-[#1a1a1a] flex items-center gap-2"
                    data-testid="mobile-button-contact"
                  >
                    <Mail className="h-4 w-4" />
                    Contact Us
                  </button>
                </div>

                <PrimaryPill
                  onClick={() => {
                    window.location.href = "/signup";
                    setMobileMenuOpen(false);
                  }}
                  className="w-full"
                >
                  Get Started Free
                </PrimaryPill>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Documentation", href: "/docs" },
      { label: "Login", href: "/login" },
      { label: "Get Started", href: "/signup" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

/** Shared multi-column footer used across the marketing/content pages. */
export function MarketingFooter() {
  return (
    <footer className="border-t border-[#e3e3e3]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-[#008060]" />
              <span className="text-[16px] font-semibold text-[#1a1a1a]">EatOut</span>
            </div>
            <p className="mt-3 max-w-xs text-[14px] leading-[1.5] text-[#6d7175]">
              One platform for your storefront, orders, payments, inventory, and team — built for online shops of every kind, anywhere in the world.
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#1a1a1a]">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[14px] text-[#6d7175] hover:text-[#1a1a1a] transition-colors"
                      data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-[#e3e3e3] pt-6">
          <p className="text-[14px] text-[#6d7175]">© 2027 EatOut. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

/** Shared page shell (nav + footer + light canvas) for simple content pages
 *  that don't need the landing page's heavy motion/hero treatment. */
export function MarketingPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f6f6f7] text-[#1a1a1a]">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  );
}
