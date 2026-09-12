import { Globe2, HeartHandshake, ShieldCheck } from "lucide-react";
import { MarketingPage, PrimaryPill } from "@/components/marketing/MarketingUI";

const VALUES = [
  {
    icon: HeartHandshake,
    title: "Merchants keep what they earn",
    body: "We charge one flat subscription, never a cut of your sales. Your growth is entirely yours.",
  },
  {
    icon: Globe2,
    title: "Built for anywhere",
    body: "Multi-language, multi-currency, and flexible fulfillment from day one, not bolted on later.",
  },
  {
    icon: ShieldCheck,
    title: "You own the relationship",
    body: "Your customers, their data, and their loyalty belong to your business, never to a marketplace standing between you.",
  },
];

export default function About() {
  return (
    <MarketingPage>
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#008060]">About EatOut</p>
          <h1
            className="text-[#1a1a1a]"
            style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 330, fontSize: "clamp(32px, 4.5vw, 52px)", lineHeight: 1.1 }}
          >
            A platform built for owners, not marketplaces
          </h1>
        </div>

        <div className="mx-auto mt-10 max-w-2xl space-y-5 text-[17px] leading-[1.7] text-[#1a1a1a]">
          <p>
            EatOut started with a simple frustration: online marketplaces made it easy to reach customers, but they took a growing cut of every single sale in exchange, and along with it, the customer relationship, the data, and control over how orders actually got fulfilled.
          </p>
          <p>
            We built EatOut as the alternative: a complete platform for running an online business (storefront, orders, payments, inventory, and fulfillment) without handing a percentage of every transaction to someone else. Whether you're a restaurant, a grocer, a pharmacy, a flower shop, or any other kind of local or online business, the tools are the same, and the economics stay in your favor as you grow.
          </p>
          <p>
            Today EatOut supports businesses selling in multiple languages and currencies, shipping or delivering however makes sense for what they sell, and building direct relationships with the customers who order from them, order after order, without a marketplace in between.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-xl border border-[#e3e3e3] bg-white p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#008060]/10">
                <v.icon className="h-5 w-5 text-[#008060]" />
              </div>
              <h3 className="mt-4 text-[16px] font-medium text-[#1a1a1a]">{v.title}</h3>
              <p className="mt-2 text-[14px] leading-[1.5] text-[#6d7175]">{v.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <PrimaryPill onClick={() => (window.location.href = "/signup")} testId="button-about-cta">
            Start your store today
          </PrimaryPill>
        </div>
      </div>
    </MarketingPage>
  );
}
