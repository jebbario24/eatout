import { env } from "../env";
import { logError } from "../logger";

// Thin wrapper around the Claude Messages API, used only for the AI store
// builder's copywriting layer. Follows this codebase's established
// nullable-external-service convention (see googleMaps.ts / messaging.ts):
// no API key configured -> every call resolves to null (a soft "skipped"),
// never throws, so the store builder's structural (rules-based) decisions
// keep working and only the copy quality degrades to templates.
const MODEL = "claude-sonnet-4-5-20250929";
const API_URL = "https://api.anthropic.com/v1/messages";

export function isAnthropicConfigured(): boolean {
  return !!env.ANTHROPIC_API_KEY;
}

/**
 * Asks Claude to return a single JSON object matching the given schema
 * description. Returns null (never throws) if no key is configured or the
 * call/parse fails — callers must have a template-based fallback.
 */
export async function generateStructuredJSON<T = any>(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<T | null> {
  if (!env.ANTHROPIC_API_KEY) return null;
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: opts.maxTokens ?? 1500,
        system: opts.system,
        messages: [{ role: "user", content: opts.prompt }],
      }),
    });
    if (!res.ok) {
      logError("Anthropic request failed", new Error(`${res.status} ${await res.text().catch(() => "")}`));
      return null;
    }
    const data: any = await res.json();
    const text: string = data?.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as T;
  } catch (e) {
    logError("Anthropic call failed", e);
    return null;
  }
}
