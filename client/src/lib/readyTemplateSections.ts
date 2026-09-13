import type { ThemeSection } from "@/lib/themeSections";
import type { StorefrontThemeId } from "@/lib/storefrontThemes";

// Turns each "Full Theme" into a genuinely ready-to-launch template: not just a
// hero/color/card-style swap, but a real starting set of content sections in
// that theme's own voice. Testimonials are deliberately left out here (a
// template can't know if the merchant has real reviews yet) — the AI store
// builder / Customize editor can add a real, review-backed testimonials
// section later. Everything below is plainly editable placeholder copy, same
// spirit as seedDefaultStorefrontContent's page templates.
const genId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

interface TemplateVoice {
  storyHeading: string;
  storyText: (storeName: string) => string;
  benefitsHeading: string;
  benefits: Array<{ icon: string; title: string; text: string }>;
  faqHeading: string;
  faq: Array<{ question: string; answer: string }>;
  newsletterHeading: string;
  newsletterText: (storeName: string) => string;
}

const VOICES: Record<StorefrontThemeId, TemplateVoice> = {
  editorial: {
    storyHeading: "Our story",
    storyText: (name) => `${name} is a considered edit of pieces chosen for their quality and quiet detail. Every product here earns its place in the collection. Edit this section to tell your own story.`,
    benefitsHeading: "The details",
    benefits: [
      { icon: "✨", title: "Considered selection", text: "Every piece is chosen with care, not mass-produced." },
      { icon: "🧵", title: "Quality first", text: "We stand behind the craft and materials in every item." },
      { icon: "🤍", title: "Personal service", text: "Questions about fit or fabric? Reach out any time." },
    ],
    faqHeading: "Frequently asked questions",
    faq: [
      { question: "What is your return policy?", answer: "Edit this with your actual return window and conditions." },
      { question: "How long does shipping take?", answer: "Edit this with your real shipping timeframes." },
      { question: "Do you offer gift wrapping?", answer: "Edit this to describe your gifting options, if any." },
      { question: "How do I contact you?", answer: "Use the Contact page linked in our header, or email us directly." },
    ],
    newsletterHeading: "Join the list",
    newsletterText: (name) => `Be the first to hear about new arrivals from ${name}.`,
  },
  fresh: {
    storyHeading: "Our story",
    storyText: (name) => `${name} brings fresh, quality goods to your table. We work with our sources closely and pick every item with our customers in mind. Edit this section to tell your own story.`,
    benefitsHeading: "Why shop with us",
    benefits: [
      { icon: "🌱", title: "Freshness first", text: "Stock is chosen and rotated for quality, not shelf life." },
      { icon: "🚚", title: "Reliable delivery", text: "Orders are prepared and shipped promptly." },
      { icon: "💬", title: "Real support", text: "Questions about an order? Reach out any time." },
    ],
    faqHeading: "Frequently asked questions",
    faq: [
      { question: "How fresh are your products?", answer: "Edit this with real details about sourcing and freshness." },
      { question: "What is your return policy?", answer: "Edit this with your actual return window and conditions." },
      { question: "Do you ship internationally?", answer: "Edit this with the countries you currently ship to." },
      { question: "How do I contact you?", answer: "Use the Contact page linked in our header, or email us directly." },
    ],
    newsletterHeading: "Subscribe to our emails",
    newsletterText: (name) => `Be the first to know about new arrivals and offers from ${name}.`,
  },
  wellness: {
    storyHeading: "Our story",
    storyText: (name) => `${name} is built around products that help you slow down and feel better. We choose everything here thoughtfully. Edit this section to tell your own story.`,
    benefitsHeading: "Why shop with us",
    benefits: [
      { icon: "🌿", title: "Thoughtfully chosen", text: "Every product is selected with intention, not mass-stocked." },
      { icon: "📦", title: "Reliable fulfillment", text: "Orders are prepared and shipped promptly." },
      { icon: "💬", title: "Real support", text: "Questions? Reach out any time through our Contact page." },
    ],
    faqHeading: "Frequently asked questions",
    faq: [
      { question: "What is your return policy?", answer: "Edit this with your actual return window and conditions." },
      { question: "How long does shipping take?", answer: "Edit this with your real shipping timeframes." },
      { question: "Are your products natural / organic?", answer: "Edit this with real details about your sourcing." },
      { question: "How do I contact you?", answer: "Use the Contact page linked in our header, or email us directly." },
    ],
    newsletterHeading: "Stay in touch",
    newsletterText: (name) => `Be the first to know about new arrivals and offers from ${name}.`,
  },
  nova: {
    storyHeading: "About us",
    storyText: (name) => `${name} is built for people who care about the details. Every product is tested and chosen for real performance, not hype. Edit this section to tell your own story.`,
    benefitsHeading: "Why shop with us",
    benefits: [
      { icon: "⚙️", title: "Built to perform", text: "Specs and quality are checked before anything ships." },
      { icon: "🚚", title: "Fast fulfillment", text: "Orders are prepared and shipped promptly." },
      { icon: "🛠️", title: "Real support", text: "Questions about specs or compatibility? Reach out any time." },
    ],
    faqHeading: "Frequently asked questions",
    faq: [
      { question: "What is your warranty / return policy?", answer: "Edit this with your actual warranty and return terms." },
      { question: "How long does shipping take?", answer: "Edit this with your real shipping timeframes." },
      { question: "Do you offer technical support?", answer: "Edit this with how customers can get help post-purchase." },
      { question: "How do I contact you?", answer: "Use the Contact page linked in our header, or email us directly." },
    ],
    newsletterHeading: "Subscribe",
    newsletterText: () => "Get notified about new drops and restocks.",
  },
};

export function getReadyTemplateSections(themeId: StorefrontThemeId, storeName: string): ThemeSection[] {
  const v = VOICES[themeId];
  return [
    {
      id: genId(),
      type: "rich-text",
      enabled: true,
      settings: { heading: v.storyHeading, text: v.storyText(storeName), buttonLabel: "", buttonUrl: "", colorScheme: "default" },
      blocks: [],
    },
    {
      id: genId(),
      type: "multicolumn",
      enabled: true,
      settings: { heading: v.benefitsHeading, columns: 3, colorScheme: "default" },
      blocks: v.benefits.map((b) => ({ id: genId(), type: "column", settings: { icon: b.icon, imageUrl: "", title: b.title, text: b.text, linkLabel: "", linkUrl: "" } })),
    },
    {
      id: genId(),
      type: "faq",
      enabled: true,
      settings: { heading: v.faqHeading, colorScheme: "default" },
      blocks: v.faq.map((f) => ({ id: genId(), type: "question", settings: { question: f.question, answer: f.answer } })),
    },
    {
      id: genId(),
      type: "newsletter",
      enabled: true,
      settings: { heading: v.newsletterHeading, text: v.newsletterText(storeName), colorScheme: "default" },
      blocks: [],
    },
  ];
}
