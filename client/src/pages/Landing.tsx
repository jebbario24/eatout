import { useRef, useLayoutEffect, useEffect } from "react";
import {
  motion,
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
import {
  Store,
  ShoppingCart,
  BarChart3,
  Users,
  Package,
  Truck,
  ArrowRight,
} from "lucide-react";
import { MarketingHeader, MarketingFooter, PrimaryPill, GhostPill } from "@/components/marketing/MarketingUI";
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

interface Feature {
  icon: typeof Store;
  title: string;
  description: string;
}

const HERO = {
  badge: "For Online Businesses Worldwide",
  headlineTop: "Sell online,",
  headlineHighlight: "anywhere in the world",
  subtitle:
    "One platform for your storefront, orders, payments, inventory, and team — built for online shops of every kind, wherever your customers are.",
  primaryCta: "Get Started Free",
  secondaryCta: "Login",
};

const FEATURES: Feature[] = [
  { icon: Store, title: "Online Storefront", description: "A branded store customers can find and order from in minutes, in any country" },
  { icon: ShoppingCart, title: "Orders & Payments", description: "Accept orders and payments from customers anywhere, in their currency" },
  { icon: Package, title: "Inventory", description: "Track stock levels and get low-stock alerts automatically" },
  { icon: Truck, title: "Flexible Fulfillment", description: "Ship with your preferred carriers or manage your own delivery — your choice" },
  { icon: Users, title: "Team Management", description: "Manage your team with roles, schedules, and permissions" },
  { icon: BarChart3, title: "Analytics", description: "Real-time insights into sales, top products, and revenue trends" },
];

const STATS = [
  { label: "Online businesses", value: 500, suffix: "+" },
  { label: "Orders processed", value: 50, suffix: "K+" },
  { label: "Platform uptime", value: 99.9, suffix: "%", decimals: 1 },
  { label: "Merchant rating", value: 4.9, suffix: "/5", decimals: 1 },
];

const HOW_IT_WORKS = [
  {
    title: "Set up your storefront",
    description: "Add your catalog, connect payments, and go live in minutes — no developer required.",
  },
  {
    title: "Fulfill orders your way",
    description: "Ship with your preferred carriers or manage your own delivery — whatever fits your business, wherever you are.",
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
  const heroImageRef = useRef<HTMLDivElement>(null);
  const featuresGridRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLDivElement>(null);

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
  }, []);

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

      <MarketingHeader />

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
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-8 text-center lg:text-left"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#008060]"
            >
              <Store className="h-3.5 w-3.5" />
              {HERO.badge}
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
              <SplitReveal text={HERO.headlineTop} delayStart={0.1} />
              <br />
              <span className="text-[#1a1a1a]">
                <SplitReveal text={HERO.headlineHighlight} delayStart={0.1 + HERO.headlineTop.split(" ").length * 0.05} />
              </span>
            </h1>

            <motion.p variants={fadeUp} className="max-w-xl mx-auto lg:mx-0 text-[18px] leading-[1.5] text-[#6d7175]">
              {HERO.subtitle}
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <PrimaryPill onClick={() => (window.location.href = "/signup")} testId="button-get-started">
                {HERO.primaryCta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </PrimaryPill>
              <GhostPill onClick={() => (window.location.href = "/login")} testId="button-login">
                {HERO.secondaryCta}
              </GhostPill>
            </motion.div>
          </motion.div>

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
            Comprehensive tools to run your online business efficiently, wherever your customers are
          </p>
        </motion.div>

        <div ref={featuresGridRef} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
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
              From signup to your first sale, in three steps
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
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.4 }}
            >
              <h2
                className="text-[#1a1a1a]"
                style={{ fontFamily: "var(--shopify-display-font)", fontWeight: 330, fontSize: "clamp(28px, 3.5vw, 40px)", lineHeight: 1.1 }}
              >
                Ready to get started?
              </h2>
              <p className="mt-4 text-[16px] text-[#6d7175]">
                Join thousands of online businesses worldwide already using EatOut.{" "}
                <span className="text-[#008060]">No commission. No marketplace lock-in. Just your business, your way.</span>
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <PrimaryPill onClick={() => (window.location.href = "/signup")} testId="button-start-now">
                  Start Now — It's Free
                  <ArrowRight className="h-4 w-4" />
                </PrimaryPill>
              </div>
            </motion.div>
          </div>
          <div className="relative h-64 lg:h-full">
            <img src={courierImage} alt="A delivery courier at night" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#ffffff] via-transparent to-transparent lg:bg-gradient-to-l" />
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
