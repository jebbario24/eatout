import { Check } from "lucide-react";
import { MarketingPage, PrimaryPill, GhostPill } from "@/components/marketing/MarketingUI";

const INCLUDED = [
  "Unlimited products and orders",
  "Your own branded online storefront",
  "Payments via Stripe and PayPal",
  "Shipping and pickup fulfillment tools",
  "Inventory tracking with low-stock alerts",
  "Team accounts with roles and permissions",
  "Real-time analytics and reporting",
  "Promotions, gift cards, and loyalty rewards",
  "Customer order tracking, out of the box",
];

const FAQS = [
  {
    q: "Is there really no commission on sales?",
    a: "Correct. EatOut charges one flat monthly subscription, not a percentage of your orders. Whether you process ten orders a month or ten thousand, the platform fee stays the same, and 100% of what you charge customers is yours.",
  },
  {
    q: "What happens after my free trial?",
    a: "You can start a 7-day free trial with no credit card charged upfront, or skip the trial and get immediate access. After the trial, your subscription is $79/month until you cancel, with no long-term contract.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There's no long-term commitment. Cancel from your account settings whenever you'd like, no phone call or retention flow required.",
  },
  {
    q: "Do you charge extra for payment processing?",
    a: "Stripe and PayPal charge their own standard processing fees on transactions, same as they would on any platform. EatOut doesn't add a markup on top of that.",
  },
];

export default function Pricing() {
  return (
    <MarketingPage>
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#008060]">Pricing</p>
          <h1
            className="text-[#1a1a1a]"
            style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 330, fontSize: "clamp(32px, 4.5vw, 52px)", lineHeight: 1.1 }}
          >
            One plan. No commission. No surprises.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] text-[#6d7175]">
            A flat monthly price, regardless of how many orders you process. Everything is included, with no paywalled features and no per-order fees.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-md rounded-[20px] border border-[#d1f0e2] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-10">
          <p className="text-[14px] font-semibold uppercase tracking-[0.04em] text-[#008060]">Standard Plan</p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-[48px] font-semibold text-[#1a1a1a]">$79</span>
            <span className="text-[16px] text-[#6d7175]">/month</span>
          </div>
          <p className="mt-1 text-[14px] text-[#6d7175]">7-day free trial, no credit card required to start</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryPill onClick={() => (window.location.href = "/signup")} testId="button-pricing-trial" className="flex-1">
              Start Free Trial
            </PrimaryPill>
            <GhostPill onClick={() => (window.location.href = "/signup")} testId="button-pricing-immediate" className="flex-1">
              Skip Trial
            </GhostPill>
          </div>

          <ul className="mt-8 space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#1a1a1a]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#008060]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-20 max-w-2xl">
          <h2 className="text-center text-[24px] font-medium text-[#1a1a1a]">Frequently asked questions</h2>
          <div className="mt-8 space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q} className="border-b border-[#e3e3e3] pb-6">
                <p className="text-[16px] font-medium text-[#1a1a1a]">{faq.q}</p>
                <p className="mt-2 text-[14px] leading-[1.6] text-[#6d7175]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarketingPage>
  );
}
