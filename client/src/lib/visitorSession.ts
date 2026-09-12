export type Channel = "direct" | "organic" | "paid" | "social" | "referral" | "unknown";

const PAID_UTM_MEDIUMS = ["cpc", "ppc", "paid", "paidsocial", "display", "retargeting"];
const SEARCH_ENGINE_HOSTS = ["google.", "bing.", "yahoo.", "duckduckgo.", "baidu.", "yandex.", "ecosia."];
const SOCIAL_HOSTS = [
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "pinterest.com",
  "snapchat.com",
  "reddit.com",
  "youtube.com",
  "wa.me",
  "whatsapp.com",
];

export function getOrCreateVisitorId(): string {
  const KEY = "eatout_visitor_id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function getOrCreateSessionId(): string {
  const KEY = "eatout_session_id";
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function deriveChannel(referrer: string, search: URLSearchParams): Channel {
  const utmMedium = (search.get("utm_medium") || "").toLowerCase();
  const utmSource = (search.get("utm_source") || "").toLowerCase();

  if (utmMedium && PAID_UTM_MEDIUMS.includes(utmMedium)) return "paid";
  if (utmMedium === "social" || SOCIAL_HOSTS.some((h) => utmSource.includes(h))) return "social";
  if (utmMedium) return "referral";

  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host === window.location.hostname) return "direct";
    if (SEARCH_ENGINE_HOSTS.some((h) => host.includes(h))) return "organic";
    if (SOCIAL_HOSTS.some((h) => host.includes(h))) return "social";
    return "referral";
  } catch {
    return "unknown";
  }
}

export interface TrackVisitPayload {
  sessionId: string;
  visitorId: string;
  channel: Channel;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  landingPath: string | null;
}

export function buildTrackVisitPayload(): TrackVisitPayload {
  const search = new URLSearchParams(window.location.search);
  const referrer = document.referrer || null;
  return {
    sessionId: getOrCreateSessionId(),
    visitorId: getOrCreateVisitorId(),
    channel: deriveChannel(referrer || "", search),
    referrer,
    utmSource: search.get("utm_source"),
    utmMedium: search.get("utm_medium"),
    utmCampaign: search.get("utm_campaign"),
    landingPath: window.location.pathname,
  };
}
