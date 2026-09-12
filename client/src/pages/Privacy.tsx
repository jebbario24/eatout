import { MarketingPage } from "@/components/marketing/MarketingUI";

const SECTIONS = [
  {
    title: "1. Information we collect",
    body: [
      "When you create an account, we collect the information you provide directly: your name, email address, phone number, and business details. When customers place orders through a storefront on EatOut, we collect the order and contact information needed to fulfill that order: name, delivery or pickup details, and payment confirmation.",
      "We also collect usage information automatically, such as pages visited and actions taken within the dashboard, to help us understand how the platform is used and to improve it.",
    ],
  },
  {
    title: "2. How we use information",
    body: [
      "We use collected information to operate and improve EatOut: processing orders and payments, providing customer support, sending service-related communications, and securing accounts against fraud and abuse.",
      "We do not sell personal information to third parties.",
    ],
  },
  {
    title: "3. Payment information",
    body: [
      "Payments are processed by Stripe and/or PayPal. EatOut does not store full card numbers on its own servers. Payment details are handled directly by these processors under their own security standards and privacy policies.",
    ],
  },
  {
    title: "4. Cookies",
    body: [
      "We use cookies and similar technologies to keep you signed in, remember preferences, and understand aggregate usage patterns. You can control cookies through your browser settings, though disabling them may affect parts of the platform's functionality.",
    ],
  },
  {
    title: "5. Data sharing",
    body: [
      "We share information only where necessary to operate the service: with payment processors to complete transactions, with infrastructure providers who host our systems, and where required by law.",
    ],
  },
  {
    title: "6. Data retention",
    body: [
      "We retain account and order information for as long as an account is active, and for a reasonable period afterward to comply with legal, tax, and accounting obligations.",
    ],
  },
  {
    title: "7. Your rights",
    body: [
      "You may access, correct, or request deletion of your personal information at any time by contacting us. Merchants are responsible for handling similar requests from their own customers in accordance with applicable law.",
    ],
  },
  {
    title: "8. Changes to this policy",
    body: [
      "We may update this policy from time to time. Material changes will be communicated through the dashboard or by email before they take effect.",
    ],
  },
  {
    title: "9. Contact",
    body: [
      "Questions about this policy can be sent to support@eatout.cloud.",
    ],
  },
];

export default function Privacy() {
  return (
    <MarketingPage>
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#008060]">Legal</p>
        <h1
          className="text-[#1a1a1a]"
          style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 330, fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.15 }}
        >
          Privacy Policy
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
