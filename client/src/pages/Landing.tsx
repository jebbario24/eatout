import { useState, useRef, useLayoutEffect, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  animate,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  useScroll,
} from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  UtensilsCrossed,
  ShoppingBasket,
  Pill,
  Flower2,
  Store,
  ShoppingCart,
  BarChart3,
  Users,
  CalendarCheck,
  Package,
  ChefHat,
  CreditCard,
  Truck,
  DollarSign,
  Clock,
  MapPin,
  Mail,
  Menu,
  ArrowRight,
  Star,
  Zap,
  ShieldCheck,
} from "lucide-react";
import heroImage from "@/assets/landing/shopify-hero.webp";
import courierImage from "@/assets/landing/shopify-courier.webp";

gsap.registerPlugin(ScrollTrigger);

// ============================================================
// Shopify-light foundation (canvas #f6f6f7, card #ffffff, border
// #e3e3e3, Shopify green #008060), built with Motion's
// motion-value primitives — magnetic
// buttons, a cursor-tracked spotlight, living aurora blobs,
// word-reveal headlines, 3D tilt cards, and a scroll-progress
// rail — instead of only mount-time fades.
// ============================================================

type VerticalKey = "restaurant" | "grocery" | "pharmacy" | "flowers" | "retail" | "driver";

interface Feature {
  icon: typeof UtensilsCrossed;
  title: string;
  description: string;
}

interface Vertical {
  key: VerticalKey;
  navLabel: string;
  icon: typeof UtensilsCrossed;
  badge: string;
  headlineTop: string;
  headlineHighlight: string;
  subtitle: string;
  primaryCta: string;
  primaryHref: string;
  secondaryCta: string;
  secondaryHref: string;
  features: Feature[];
}

const VERTICALS: Vertical[] = [
  {
    key: "restaurant",
    navLabel: "Restaurants",
    icon: ChefHat,
    badge: "For Restaurants",
    headlineTop: "Run your restaurant",
    headlineHighlight: "like never before",
    subtitle:
      "Orders, reservations, menus, inventory, and staff in one place. Accept online orders with integrated payments and your own delivery fleet.",
    primaryCta: "Get Started Free",
    primaryHref: "/signup",
    secondaryCta: "Login",
    secondaryHref: "/login",
    features: [
      { icon: ShoppingCart, title: "POS System", description: "Fast point-of-sale for dine-in, takeout, and delivery orders" },
      { icon: UtensilsCrossed, title: "Menu Management", description: "Easy menu updates with categories, items, pricing, and availability" },
      { icon: CalendarCheck, title: "Reservations", description: "Table management and reservation system to maximize seating" },
      { icon: Package, title: "Inventory", description: "Track stock levels and get low-stock alerts automatically" },
      { icon: Users, title: "Staff Management", description: "Manage your team with roles, schedules, and permissions" },
      { icon: BarChart3, title: "Analytics", description: "Real-time insights into sales, popular items, and revenue trends" },
    ],
  },
  {
    key: "grocery",
    navLabel: "Grocery",
    icon: ShoppingBasket,
    badge: "For Grocery Stores",
    headlineTop: "Sell groceries online",
    headlineHighlight: "with delivery built in",
    subtitle:
      "A full storefront for your grocery business — catalog, checkout, and your own delivery drivers, without paying a marketplace commission.",
    primaryCta: "Get Started Free",
    primaryHref: "/signup",
    secondaryCta: "Login",
    secondaryHref: "/login",
    features: [
      { icon: ShoppingBasket, title: "Product Catalog", description: "Organize by category, set units and pricing, manage stock in real time" },
      { icon: Package, title: "Inventory Sync", description: "Automatic out-of-stock handling so customers never order what you don't have" },
      { icon: Truck, title: "Your Own Drivers", description: "Recruit and manage a delivery fleet just for your store" },
      { icon: CreditCard, title: "Online Payments", description: "Accept cards and digital wallets at checkout" },
      { icon: BarChart3, title: "Analytics", description: "See best-selling products and peak ordering hours" },
      { icon: Zap, title: "Fast Setup", description: "Launch your online store in an afternoon, not weeks" },
    ],
  },
  {
    key: "pharmacy",
    navLabel: "Pharmacy",
    icon: Pill,
    badge: "For Pharmacies",
    headlineTop: "Modernize your pharmacy",
    headlineHighlight: "without the overhead",
    subtitle:
      "Prescription-aware product listings, dosage details, and reliable local delivery — built for how pharmacies actually operate.",
    primaryCta: "Get Started Free",
    primaryHref: "/signup",
    secondaryCta: "Login",
    secondaryHref: "/login",
    features: [
      { icon: Pill, title: "Prescription Fields", description: "Flag items that require a prescription, track dosage and pack size" },
      { icon: ShieldCheck, title: "Trusted Checkout", description: "Secure payments customers feel comfortable using" },
      { icon: Truck, title: "Reliable Delivery", description: "Your own vetted, approved drivers for time-sensitive orders" },
      { icon: Package, title: "Inventory Control", description: "Stay on top of stock for essential medications" },
      { icon: BarChart3, title: "Analytics", description: "Track order volume and delivery performance" },
      { icon: Users, title: "Staff Access", description: "Role-based access for pharmacists and counter staff" },
    ],
  },
  {
    key: "flowers",
    navLabel: "Flowers",
    icon: Flower2,
    badge: "For Flower Shops",
    headlineTop: "Bloom your business",
    headlineHighlight: "online and on time",
    subtitle:
      "Showcase arrangements by occasion, take orders for same-day delivery, and let your own couriers get them there fresh.",
    primaryCta: "Get Started Free",
    primaryHref: "/signup",
    secondaryCta: "Login",
    secondaryHref: "/login",
    features: [
      { icon: Flower2, title: "Occasion Tagging", description: "Birthdays, sympathy, weddings — organize your catalog the way customers browse" },
      { icon: Clock, title: "Same-Day Delivery", description: "Time-sensitive orders routed to your available drivers" },
      { icon: CreditCard, title: "Online Payments", description: "Accept payment for custom and pre-made arrangements alike" },
      { icon: Star, title: "Care Instructions", description: "Attach care notes to every arrangement automatically" },
      { icon: BarChart3, title: "Analytics", description: "See which arrangements and occasions drive the most sales" },
      { icon: Package, title: "Inventory", description: "Track stem counts and seasonal availability" },
    ],
  },
  {
    key: "retail",
    navLabel: "Shops",
    icon: Store,
    badge: "For Local Shops",
    headlineTop: "Any shop, one platform",
    headlineHighlight: "with delivery included",
    subtitle:
      "Whatever you sell, get a real online storefront and a delivery fleet you own — no per-order commission to a marketplace.",
    primaryCta: "Get Started Free",
    primaryHref: "/signup",
    secondaryCta: "Login",
    secondaryHref: "/login",
    features: [
      { icon: Store, title: "Flexible Catalog", description: "Brand, unit, and SKU fields that adapt to what you sell" },
      { icon: ShoppingCart, title: "Online Storefront", description: "A branded ordering page customers can find and use in minutes" },
      { icon: Truck, title: "Your Own Drivers", description: "Recruit, approve, and manage delivery drivers for your shop only" },
      { icon: CreditCard, title: "Online Payments", description: "Stripe and PayPal built in" },
      { icon: BarChart3, title: "Analytics", description: "Revenue, order, and customer insights in one dashboard" },
      { icon: Zap, title: "Fast Setup", description: "No developer needed — configure and launch yourself" },
    ],
  },
];

const STATS = [
  { label: "Local businesses", value: 500, suffix: "+" },
  { label: "Orders delivered", value: 50, suffix: "K+" },
  { label: "Avg. delivery time", value: 28, suffix: " min" },
  { label: "Merchant rating", value: 4.9, suffix: "/5", decimals: 1 },
];

const HOW_IT_WORKS = [
  {
    title: "Set up your storefront",
    description: "Pick your business type, add your catalog, and go live in minutes — no developer required.",
  },
  {
    title: "Bring your own drivers",
    description: "Invite and approve the drivers who deliver for you. You manage your own fleet, not a shared pool.",
  },
  {
    title: "Grow with real data",
    description: "Promos, analytics, and payouts built in — everything you need to run and grow the business.",
  },
];

// ---------- Motion primitives ----------

/** Scroll-linked progress rail across the very top of the page. */
function ScrollProgressRail() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-[#008060] via-[#008060] to-transparent"
      style={{ scaleX }}
    />
  );
}

/** Two slow-drifting blurred blobs — a living background instead of a static gradient. */
function AuroraField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute left-1/4 top-0 h-[420px] w-[420px] rounded-full bg-[#008060]/[0.10] blur-[110px]"
        animate={{ x: [0, 90, -40, 0], y: [0, -60, 40, 0], scale: [1, 1.15, 0.92, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-1/4 top-20 h-[380px] w-[380px] rounded-full bg-[#d1f0e2]/40 blur-[100px]"
        animate={{ x: [0, -70, 50, 0], y: [0, 50, -30, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </div>
  );
}

/** Subtle animated grain for tactile depth against the flat dark canvas. */
function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.035] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}

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

function PrimaryPill({
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

function GhostPill({
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

/** Headline that reveals word-by-word, each word masked and sliding up into place. */
function SplitReveal({ text, delayStart = 0 }: { text: string; delayStart?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-top pb-1">
          <motion.span
            className="inline-block"
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ duration: 0.7, delay: delayStart + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </>
  );
}

/** Feature card with a cursor-driven 3D tilt and a light-sweep on hover. */
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [7, -7]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-7, 7]), { stiffness: 300, damping: 30 });
  const glowX = useTransform(x, [-0.5, 0.5], ["0%", "100%"]);
  const glowY = useTransform(y, [-0.5, 0.5], ["0%", "100%"]);
  const glowBackground = useMotionTemplate`radial-gradient(220px circle at ${glowX} ${glowY}, rgba(54,244,164,0.14), transparent 70%)`;

  return (
    <motion.div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className={`feature-card relative overflow-hidden rounded-xl border border-[#e3e3e3] bg-[#ffffff] p-6 ${className}`}
    >
      <motion.div className="pointer-events-none absolute inset-0" style={{ background: glowBackground }} />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

function StatCounter({ value, suffix, decimals = 0 }: { value: number; suffix: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!isInView || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(latest) {
        node.textContent = latest.toFixed(decimals);
      },
    });
    return () => controls.stop();
  }, [isInView, value, decimals]);

  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span ref={ref}>0</span>
      <span>{suffix}</span>
    </span>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export default function Landing() {
  const [activeVertical, setActiveVertical] = useState<VerticalKey>("restaurant");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroImageRef = useRef<HTMLDivElement>(null);
  const featuresGridRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLDivElement>(null);

  const vertical = VERTICALS.find((v) => v.key === activeVertical)!;

  // Cursor-tracked spotlight across the hero section.
  const spotX = useMotionValue(400);
  const spotY = useMotionValue(300);
  const spotlight = useMotionTemplate`radial-gradient(600px circle at ${spotX}px ${spotY}px, rgba(54,244,164,0.07), transparent 70%)`;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (heroImageRef.current) {
        gsap.to(heroImageRef.current, {
          y: -14,
          duration: 2.6,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      }
    }, rootRef);
    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".feature-card");
      gsap.fromTo(
        cards,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
          stagger: 0.08,
          scrollTrigger: { trigger: featuresGridRef.current, start: "top 85%", once: true },
        }
      );
    }, featuresGridRef);
    return () => ctx.revert();
  }, [activeVertical]);

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-x-hidden bg-[#f6f6f7] text-[#1a1a1a]"
      style={
        {
          "--shopify-display-font": "'Inter', ui-sans-serif, system-ui, sans-serif",
          "--shopify-ui-font": "'Inter', ui-sans-serif, system-ui, sans-serif",
        } as React.CSSProperties
      }
    >
      <ScrollProgressRail />
      <GrainOverlay />

      {/* Navigation */}
      <div className="sticky top-0 z-50 px-3 pt-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-xl border border-[#e3e3e3] bg-[#ffffff]/90 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-[#ffffff]/70">
          <div className="flex shrink-0 items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-[#008060]" />
            <span className="text-lg font-semibold tracking-tight text-[#1a1a1a]">EatOut</span>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {VERTICALS.map((v) => (
              <button
                key={v.key}
                onClick={() => setActiveVertical(v.key)}
                data-testid={`tab-${v.key}`}
                aria-label={v.navLabel}
                aria-pressed={activeVertical === v.key}
                className="relative px-3.5 py-2 text-[14px] font-medium tracking-[0.015em] transition-colors"
              >
                {activeVertical === v.key && (
                  <motion.span
                    layoutId="nav-vertical-pill"
                    className="absolute inset-0 rounded-full bg-black/[0.04] border border-black/10"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className={`relative flex items-center gap-1.5 ${activeVertical === v.key ? "text-[#1a1a1a]" : "text-[#6d7175]"}`}>
                  {v.navLabel}
                  {activeVertical === v.key && <span className="h-1 w-1 rounded-full bg-[#008060]" />}
                </span>
              </button>
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
            <button
              onClick={() => (window.location.href = "/contact")}
              className="text-[14px] font-medium text-[#6d7175] hover:text-[#1a1a1a] transition-colors"
              data-testid="button-contact-header"
            >
              Contact
            </button>
            <PrimaryPill onClick={() => (window.location.href = `${vertical.primaryHref}?type=${vertical.key}`)} className="px-4 py-2 text-[14px]" testId="button-nav-cta">
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
                    <UtensilsCrossed className="h-5 w-5 text-[#008060]" />
                    EatOut
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-8 space-y-6">
                  <div className="space-y-3">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#6d7175]">I'm interested in</p>
                    <div className="grid grid-cols-2 gap-2">
                      {VERTICALS.map((v) => (
                        <button
                          key={v.key}
                          onClick={() => {
                            setActiveVertical(v.key);
                            setMobileMenuOpen(false);
                          }}
                          data-testid={`mobile-tab-${v.key}`}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[14px] font-medium transition-colors ${
                            activeVertical === v.key
                              ? "border-[#008060]/40 bg-[#008060]/10 text-[#1a1a1a]"
                              : "border-[#e3e3e3] text-[#6d7175]"
                          }`}
                        >
                          <v.icon className="h-4 w-4" />
                          {v.navLabel}
                        </button>
                      ))}
                    </div>
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
                      window.location.href = `${vertical.primaryHref}?type=${vertical.key}`;
                      setMobileMenuOpen(false);
                    }}
                    className="w-full"
                  >
                    {vertical.primaryCta}
                  </PrimaryPill>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div
        ref={heroSectionRef}
        className="relative"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          spotX.set(e.clientX - rect.left);
          spotY.set(e.clientY - rect.top);
        }}
      >
        <AuroraField />
        <motion.div className="pointer-events-none absolute inset-0" style={{ background: spotlight }} />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeVertical}
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="space-y-8 text-center lg:text-left"
            >
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#008060]"
              >
                <vertical.icon className="h-3.5 w-3.5" />
                {vertical.badge}
              </motion.div>

              <h1
                className="font-normal text-[#1a1a1a]"
                style={{
                  fontFamily: "var(--shopify-display-font)",
                  fontWeight: 330,
                  fontSize: "clamp(40px, 6.5vw, 70px)",
                  lineHeight: 0.98,
                  letterSpacing: "0.01em",
                }}
              >
                <SplitReveal text={vertical.headlineTop} delayStart={0.1} />
                <br />
                <span className="text-[#1a1a1a]">
                  <SplitReveal text={vertical.headlineHighlight} delayStart={0.1 + vertical.headlineTop.split(" ").length * 0.05} />
                </span>
              </h1>

              <motion.p variants={fadeUp} className="max-w-xl mx-auto lg:mx-0 text-[18px] leading-[1.5] text-[#6d7175]">
                {vertical.subtitle}
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <PrimaryPill onClick={() => (window.location.href = `${vertical.primaryHref}?type=${vertical.key}`)} testId="button-get-started">
                  {vertical.primaryCta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </PrimaryPill>
                <GhostPill onClick={() => (window.location.href = vertical.secondaryHref)} testId="button-login">
                  {vertical.secondaryCta}
                </GhostPill>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          <motion.div
            ref={heroImageRef}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="relative"
          >
            <div className="absolute -inset-10 -z-10 rounded-full bg-[#008060]/10 blur-[100px]" />
            <div className="overflow-hidden rounded-xl border border-[#e3e3e3]">
              <img
                src={heroImage}
                alt="A confident local business owner"
                className="w-full h-auto object-cover"
              />
            </div>
          </motion.div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-[#e3e3e3]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <div
                  className="text-[#008060]"
                  style={{ fontFamily: "var(--shopify-display-font)", fontWeight: 400, fontSize: "32px", letterSpacing: "0.02em" }}
                >
                  <StatCounter value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                </div>
                <div className="mt-1 text-[14px] text-[#6d7175]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features — bento-style: first card featured (spans 2 cols), rest standard */}
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#008060]">Everything included</p>
          <h2
            className="text-[#1a1a1a]"
            style={{ fontFamily: "var(--shopify-display-font)", fontWeight: 330, fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.1 }}
          >
            Everything you need
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] text-[#6d7175]">
            Comprehensive tools to run your business efficiently and grow with delivery built in
          </p>
        </motion.div>

        <div ref={featuresGridRef} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vertical.features.map((feature, index) => (
            <TiltCard key={feature.title} className={index === 0 ? "lg:col-span-2" : ""}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#008060]/10">
                <feature.icon className="h-5 w-5 text-[#008060]" />
              </div>
              <h3 className="mb-1.5 text-[18px] font-medium text-[#1a1a1a]">{feature.title}</h3>
              <p className={`text-[14px] leading-[1.5] text-[#6d7175] ${index === 0 ? "max-w-md" : ""}`}>{feature.description}</p>
            </TiltCard>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="border-y border-[#e3e3e3] bg-[#ffffff]/40">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#008060]">The process</p>
            <h2
              className="text-[#1a1a1a]"
              style={{ fontFamily: "var(--shopify-display-font)", fontWeight: 330, fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.1 }}
            >
              How it works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[16px] text-[#6d7175]">
              From signup to your first delivery, in three steps
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                whileHover={{ y: -4 }}
                className="rounded-[20px] border border-[#d1f0e2] bg-[#ffffff] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#008060] text-[15px] font-semibold text-white">
                  {index + 1}
                </div>
                <h3 className="mb-2 text-[20px] font-medium text-[#1a1a1a]">{step.title}</h3>
                <p className="text-[15px] leading-[1.5] text-[#6d7175]">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 overflow-hidden rounded-[20px] border border-[#e3e3e3] bg-[#ffffff] lg:grid-cols-2">
          <div className="p-10 sm:p-14">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeVertical}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className="text-[#1a1a1a]"
                  style={{ fontFamily: "var(--shopify-display-font)", fontWeight: 330, fontSize: "clamp(28px, 3.5vw, 40px)", lineHeight: 1.1 }}
                >
                  Ready to get started?
                </h2>
                <p className="mt-4 text-[16px] text-[#6d7175]">
                  Join hundreds of local businesses already using EatOut.{" "}
                  <span className="text-[#008060]">No commission. No shared driver pool. Just your business.</span>
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <PrimaryPill onClick={() => (window.location.href = `${vertical.primaryHref}?type=${vertical.key}`)} testId="button-start-now">
                    Start Now — It's Free
                    <ArrowRight className="h-4 w-4" />
                  </PrimaryPill>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="relative h-64 lg:h-full">
            <img src={courierImage} alt="A delivery courier at night" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#ffffff] via-transparent to-transparent lg:bg-gradient-to-l" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#e3e3e3]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-[#008060]" />
              <span className="text-[16px] font-semibold text-[#1a1a1a]">EatOut</span>
            </div>
            <p className="text-[14px] text-[#6d7175]">© 2027 EatOut. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
