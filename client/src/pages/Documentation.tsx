import { Store, ShoppingCart, Truck, Package, Users, BarChart3, CreditCard, Rocket } from "lucide-react";
import { MarketingPage } from "@/components/marketing/MarketingUI";

const SECTIONS = [
  {
    icon: Rocket,
    title: "Getting started",
    body: [
      "After you sign up, the first thing to do is set up your business profile under Settings: your business type (restaurant, grocery, pharmacy, flowers, or retail), name, and storefront URL. This determines the terminology used throughout your dashboard (\"menu\" vs. \"products\", for example) and where customers find you online.",
      "Next, add your catalog: products, prices, and categories, from the Catalog section of your dashboard. You can add items one at a time or organize them into collections to make your storefront easier to browse.",
      "Once you have at least one product and a payment method connected, your storefront is live at your chosen URL and ready to accept real orders.",
    ],
  },
  {
    icon: Store,
    title: "Your online storefront",
    body: [
      "Every account gets a branded, hosted storefront, no separate website builder needed. Customize your storefront's look, pages, and blog content from the Online Store section of your dashboard.",
      "Your storefront works on any device and supports multiple languages, so customers can browse and check out in the language they're most comfortable with.",
    ],
  },
  {
    icon: ShoppingCart,
    title: "Orders",
    body: [
      "All incoming orders appear in your Orders dashboard in real time. Each order moves through a simple status lifecycle (pending, confirmed, preparing, ready, shipped for shipping orders, and completed) that you control manually or through automatic status progression rules.",
      "You can also build orders manually as drafts for phone or in-person customers, then finalize them into the same order flow as online checkouts.",
    ],
  },
  {
    icon: Truck,
    title: "Fulfillment & tracking",
    body: [
      "EatOut supports both pickup and shipping as fulfillment methods. Configure which ones your business offers under Online Store → Order Types.",
      "For shipped orders, once you mark an order \"Shipped\" you can attach a carrier name and tracking number. That information is automatically shown to the customer on their public order-tracking page, so they always know where their order stands without having to contact you.",
    ],
  },
  {
    icon: CreditCard,
    title: "Payments & payouts",
    body: [
      "Connect Stripe and/or PayPal to accept card and digital wallet payments directly at checkout. Funds are deposited to your connected bank account on your chosen payout schedule, and EatOut never holds your money longer than necessary.",
      "Because EatOut charges a flat subscription instead of a commission, 100% of what you charge customers (minus standard payment-processor fees) is yours.",
    ],
  },
  {
    icon: Package,
    title: "Inventory",
    body: [
      "Track stock levels per product and get automatic low-stock alerts before you run out. Inventory updates in real time as orders come in, so your storefront never sells something you don't actually have.",
    ],
  },
  {
    icon: Users,
    title: "Team & permissions",
    body: [
      "Invite staff to your account under Staff Management and assign roles that control what they can see and do, from front-of-house order handling to full administrative access.",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics & reporting",
    body: [
      "The Analytics section gives you real-time visibility into revenue, order volume, top products, and customer trends, so you can make decisions based on what's actually happening in your business, not guesswork.",
    ],
  },
];

export default function Documentation() {
  return (
    <MarketingPage>
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#008060]">Documentation</p>
          <h1
            className="text-[#1a1a1a]"
            style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 330, fontSize: "clamp(32px, 4.5vw, 52px)", lineHeight: 1.1 }}
          >
            Everything you need to run your store
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] text-[#6d7175]">
            An overview of every part of the platform, from your first product to your first payout.
          </p>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.title} className="rounded-xl border border-[#e3e3e3] bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#008060]/10">
                  <section.icon className="h-5 w-5 text-[#008060]" />
                </div>
                <h2 className="text-[20px] font-medium text-[#1a1a1a]">{section.title}</h2>
              </div>
              <div className="mt-4 space-y-3">
                {section.body.map((p, i) => (
                  <p key={i} className="text-[15px] leading-[1.6] text-[#6d7175]">{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-[#e3e3e3] bg-white p-8 text-center">
          <p className="text-[16px] text-[#1a1a1a]">
            Have a question this page doesn't answer?{" "}
            <a href="/contact" className="text-[#008060] hover:underline" data-testid="link-docs-contact">Contact our support team</a>.
          </p>
        </div>
      </div>
    </MarketingPage>
  );
}
