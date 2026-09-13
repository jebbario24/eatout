import type { Restaurant, MenuItem } from "@shared/schema";
import { generateStructuredJSON, isAnthropicConfigured } from "./anthropic";
import type { StoreBlueprint, StoreBrief, NewSectionPlan } from "./storeIntelligence";

interface CopyResult {
  brandStoryHeading: string;
  brandStoryText: string;
  benefits: Array<{ icon: string; title: string; text: string }>;
  faq: Array<{ question: string; answer: string }>;
  newsletterHeading: string;
  newsletterText: string;
  usedLLM: boolean;
}

const GENERIC_BENEFIT_ICONS = ["✨", "🚚", "💬"];

function templateCopy(vertical: string, tier: string, storeName: string): Omit<CopyResult, "usedLLM"> {
  const flavor = vertical.replace("-", " ");
  return {
    brandStoryHeading: "Our story",
    brandStoryText: `${storeName} brings together a carefully chosen selection for people who care about ${flavor}. Every product here was picked with our customers in mind — edit this section any time to tell your own story.`,
    benefits: [
      { icon: GENERIC_BENEFIT_ICONS[0], title: "Thoughtfully chosen", text: "Every product is selected with care, not mass-stocked." },
      { icon: GENERIC_BENEFIT_ICONS[1], title: "Reliable fulfillment", text: "Orders are prepared and shipped promptly." },
      { icon: GENERIC_BENEFIT_ICONS[2], title: "Real support", text: "Questions? Reach out any time through our Contact page." },
    ],
    faq: [
      { question: "How long does shipping take?", answer: "Edit this with your actual shipping timeframes — set them under Settings." },
      { question: "What is your return policy?", answer: "Edit this to match your Refund Policy page." },
      { question: "Do you ship internationally?", answer: "Edit this with the countries you currently ship to." },
      { question: "How can I contact you?", answer: "Use the Contact page linked in our header, or email us directly." },
    ],
    newsletterHeading: "Subscribe to our emails",
    newsletterText: `Be the first to know about new arrivals and offers from ${storeName}.`,
  };
}

async function llmCopy(opts: {
  restaurant: Restaurant;
  vertical: string;
  tier: string;
  brief?: StoreBrief;
  sampleItemNames: string[];
  sampleCategoryNames: string[];
}): Promise<Omit<CopyResult, "usedLLM"> | null> {
  const system = `You are writing storefront copy for a real small-business ecommerce site. Use ONLY the facts given to you. Never invent specific claims you weren't given — no fabricated shipping times, certifications, founding dates, guarantees, or statistics. Where a concrete detail (like a shipping window or return window) isn't provided, write copy that clearly needs the merchant to fill in a placeholder rather than inventing a number. Return ONLY a single JSON object, no prose, matching exactly this shape: {"brandStoryHeading": string, "brandStoryText": string (2-4 sentences), "benefits": [{"icon": string (single emoji), "title": string, "text": string} x3], "faq": [{"question": string, "answer": string} x4], "newsletterHeading": string, "newsletterText": string}`;

  const prompt = `Store name: ${opts.restaurant.name}
Business type: ${opts.restaurant.businessType}
Detected vertical: ${opts.vertical}, tier: ${opts.tier}
Merchant's own description of the brand: ${opts.brief?.description || "(none provided)"}
Target audience: ${opts.brief?.targetAudience || "(not specified)"}
Target market: ${opts.brief?.targetMarket || opts.restaurant.country || "(not specified)"}
Sample categories: ${opts.sampleCategoryNames.join(", ") || "(none yet)"}
Sample products: ${opts.sampleItemNames.join(", ") || "(none yet)"}

Write on-brand storefront copy per the required JSON shape.`;

  return generateStructuredJSON<Omit<CopyResult, "usedLLM">>({ system, prompt, maxTokens: 1200 });
}

export async function generateStoreCopy(
  restaurant: Restaurant,
  blueprint: Pick<StoreBlueprint, "vertical" | "tier">,
  brief: StoreBrief | undefined,
  sampleItems: MenuItem[],
  sampleCategoryNames: string[],
): Promise<CopyResult> {
  const fallback = templateCopy(blueprint.vertical, blueprint.tier, restaurant.name);
  if (!isAnthropicConfigured()) return { ...fallback, usedLLM: false };

  const llm = await llmCopy({
    restaurant,
    vertical: blueprint.vertical,
    tier: blueprint.tier,
    brief,
    sampleItemNames: sampleItems.slice(0, 8).map((i) => i.name),
    sampleCategoryNames,
  });
  if (!llm) return { ...fallback, usedLLM: false };
  return { ...fallback, ...llm, usedLLM: true };
}

/** Merges generated copy into the blueprint's proposed new sections in place. */
export function applyCopyToSections(newSections: NewSectionPlan[], copy: CopyResult): NewSectionPlan[] {
  return newSections.map((section) => {
    if (section.type === "rich-text") {
      return { ...section, settings: { ...section.settings, heading: copy.brandStoryHeading, text: copy.brandStoryText } };
    }
    if (section.type === "multicolumn" && section.blocks.length === 0) {
      return {
        ...section,
        blocks: copy.benefits.map((b) => ({ type: "column", settings: { icon: b.icon, imageUrl: "", title: b.title, text: b.text, linkLabel: "", linkUrl: "" } })),
      };
    }
    if (section.type === "faq" && section.blocks.length === 0) {
      return { ...section, blocks: copy.faq.map((f) => ({ type: "question", settings: { question: f.question, answer: f.answer } })) };
    }
    if (section.type === "newsletter") {
      return { ...section, settings: { ...section.settings, heading: copy.newsletterHeading, text: copy.newsletterText } };
    }
    return section;
  });
}
