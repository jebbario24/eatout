import type { Restaurant } from "@shared/schema";
import { generateStructuredJSON, isAnthropicConfigured } from "./anthropic";
import type { StoreBrief, StoreFacts } from "./storeIntelligence";

export interface StoreCopy {
  tagline: string;
  heroHeading: string;
  heroSubheading: string;
  buttonText: string;
  aboutUsHeading: string;
  aboutUsBody: string;
  usedLLM: boolean;
}

function templateCopy(brief: StoreBrief, storeName: string): Omit<StoreCopy, "usedLLM"> {
  const industry = brief.industry || "retail";
  return {
    tagline: brief.stylePreference ? `${brief.stylePreference} ${industry}` : `Quality ${industry}, made simple`,
    heroHeading: `Welcome to ${storeName}`,
    heroSubheading: brief.targetAudience
      ? `Thoughtfully chosen for ${brief.targetAudience.toLowerCase()}.`
      : "Quality products, chosen with care.",
    buttonText: "Shop Now",
    aboutUsHeading: "About Us",
    aboutUsBody: `${storeName} brings together a carefully chosen selection for people who care about quality. Edit this section any time to tell your own story.`,
  };
}

async function llmCopy(brief: StoreBrief, storeName: string, facts: StoreFacts): Promise<Omit<StoreCopy, "usedLLM"> | null> {
  const system = `You are writing storefront copy for a real small ecommerce business. Use ONLY the facts given to you. Never invent specific claims you weren't given — no fabricated shipping times, certifications, founding dates, or statistics. Return ONLY a single JSON object, no prose, matching exactly this shape: {"tagline": string (short, under 8 words), "heroHeading": string, "heroSubheading": string (one sentence), "buttonText": string (2-3 words), "aboutUsHeading": string, "aboutUsBody": string (2-4 sentences)}`;
  const prompt = `Store name: ${storeName}
Industry: ${brief.industry}
Brand style: ${brief.stylePreference || "(not specified)"}
Target audience: ${brief.targetAudience || "(not specified)"}
Target market: ${brief.targetMarket || "(not specified)"}
Product count: ${facts.productCount}
Price range: ${facts.priceRange ? `$${facts.priceRange.min}-$${facts.priceRange.max}` : "(no products yet)"}

Write on-brand storefront copy per the required JSON shape.`;
  return generateStructuredJSON<Omit<StoreCopy, "usedLLM">>({ system, prompt, maxTokens: 800 });
}

export async function draftCopy(brief: StoreBrief, storeName: string, facts: StoreFacts): Promise<StoreCopy> {
  const templated = templateCopy(brief, storeName);
  if (!isAnthropicConfigured()) return { ...templated, usedLLM: false };
  const ai = await llmCopy(brief, storeName, facts);
  if (!ai) return { ...templated, usedLLM: false };
  return { ...templated, ...ai, usedLLM: true };
}
