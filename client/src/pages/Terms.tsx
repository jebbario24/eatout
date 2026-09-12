import { MarketingPage } from "@/components/marketing/MarketingUI";

const SECTIONS = [
  {
    title: "1. Acceptance of terms",
    body: [
      "By creating an account or using EatOut, you agree to these Terms of Service. If you're using EatOut on behalf of a business, you're agreeing on that business's behalf and confirming you have the authority to do so.",
    ],
  },
  {
    title: "2. Your account",
    body: [
      "You're responsible for maintaining the security of your account credentials and for all activity that happens under your account. Notify us promptly if you suspect unauthorized access.",
    ],
  },
  {
    title: "3. Subscription and billing",
    body: [
      "EatOut is billed as a flat monthly subscription. Trials, where offered, convert to a paid subscription automatically unless cancelled before the trial ends. Subscriptions renew automatically each billing period until cancelled.",
      "You can cancel at any time from your account settings; cancellation takes effect at the end of the current billing period, and no partial refunds are issued for unused time within a period.",
    ],
  },
  {
    title: "4. Acceptable use",
    body: [
      "You agree not to use EatOut to sell illegal goods or services, to defraud customers, or to violate applicable consumer protection, tax, or advertising laws. You're responsible for the accuracy of your own product listings, pricing, and fulfillment.",
    ],
  },
  {
    title: "5. Payments to merchants",
    body: [
      "Payments collected from your customers are processed by Stripe and/or PayPal and paid out to your connected bank account on your chosen schedule, subject to those processors' own terms and any holds required for fraud prevention or dispute resolution.",
    ],
  },
  {
    title: "6. Platform availability",
    body: [
      "We aim to keep EatOut available and reliable, but we don't guarantee uninterrupted service. We'll make reasonable efforts to notify you of planned maintenance that may affect availability.",
    ],
  },
  {
    title: "7. Termination",
    body: [
      "You may stop using EatOut at any time by cancelling your subscription. We may suspend or terminate accounts that violate these terms, engage in fraud, or create risk for other users of the platform.",
    ],
  },
  {
    title: "8. Limitation of liability",
    body: [
      "EatOut is provided \"as is.\" To the maximum extent permitted by law, EatOut is not liable for indirect, incidental, or consequential damages arising from use of the platform, including lost profits or lost data.",
    ],
  },
  {
    title: "9. Changes to these terms",
    body: [
      "We may update these terms from time to time. Material changes will be communicated through the dashboard or by email before they take effect. Continued use of EatOut after changes take effect constitutes acceptance of the updated terms.",
    ],
  },
  {
    title: "10. Contact",
    body: [
      "Questions about these terms can be sent to support@eatout.cloud.",
    ],
  },
];

export default function Terms() {
  return (
    <MarketingPage>
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#008060]">Legal</p>
        <h1
          className="text-[#1a1a1a]"
          style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 330, fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.15 }}
        >
          Terms of Service
        </h1>
        <p className="mt-3 text-[14px] text-[#6d7175]">Last updated January 1, 2027</p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 className="text-[18px] font-medium text-[#1a1a1a]">{s.title}</h2>
              <div className="mt-2 space-y-3">
                {s.body.map((p, i) => (
                  <p key={i} className="text-[15px] leading-[1.7] text-[#6d7175]">{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MarketingPage>
  );
}
