/**
 * Channel-agnostic outbound messaging for marketing campaigns (Tier 8).
 *
 * Every channel degrades gracefully: if the provider env vars aren't set, the
 * send is reported as "skipped" (not "failed") so campaign deliveries still get
 * recorded in the outbox and the merchant sees exactly what would have gone out.
 *
 *   Email  -> SMTP via nodemailer            (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
 *   SMS    -> Twilio REST API (fetch, no SDK)(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)
 *   Push   -> web-push                       (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT) + a stored subscription
 */
import nodemailer, { type Transporter } from "nodemailer";
import webpush from "web-push";
import { logError } from "../logger";

export type SendResult = { status: "sent" | "failed" | "skipped"; error?: string; id?: string };

let _transport: Transporter | null | undefined;
function emailTransport(): Transporter | null {
  if (_transport !== undefined) return _transport;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    _transport = null;
    return null;
  }
  _transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: (Number(SMTP_PORT) || 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return _transport;
}

let _vapidReady: boolean | undefined;
function vapidReady(): boolean {
  if (_vapidReady !== undefined) return _vapidReady;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    _vapidReady = false;
    return false;
  }
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:noreply@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    _vapidReady = true;
  } catch {
    _vapidReady = false;
  }
  return _vapidReady;
}

export function messagingStatus() {
  return {
    email: !!emailTransport(),
    sms: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM),
    push: vapidReady(),
  };
}

export async function sendEmail(opts: { to: string; subject: string; body: string; fromName?: string }): Promise<SendResult> {
  const t = emailTransport();
  if (!t) return { status: "skipped", error: "SMTP not configured" };
  if (!opts.to) return { status: "skipped", error: "no recipient address" };
  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
    const info = await t.sendMail({
      from: opts.fromName ? `"${opts.fromName}" <${from}>` : from,
      to: opts.to,
      subject: opts.subject || "(no subject)",
      text: opts.body,
      html: `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap;line-height:1.6">${escapeHtml(opts.body)}</div>`,
    });
    return { status: "sent", id: info.messageId };
  } catch (e: any) {
    logError("sendEmail failed", e);
    return { status: "failed", error: e?.message || String(e) };
  }
}

export async function sendSms(opts: { to: string; body: string }): Promise<SendResult> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    return { status: "skipped", error: "Twilio not configured" };
  }
  if (!opts.to) return { status: "skipped", error: "no recipient number" };
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: opts.to, From: TWILIO_FROM, Body: opts.body }).toString(),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { status: "failed", error: json?.message || `Twilio ${res.status}` };
    return { status: "sent", id: json?.sid };
  } catch (e: any) {
    logError("sendSms failed", e);
    return { status: "failed", error: e?.message || String(e) };
  }
}

export async function sendPush(opts: { subscription: any; title: string; body: string; url?: string }): Promise<SendResult> {
  if (!vapidReady()) return { status: "skipped", error: "push not configured" };
  if (!opts.subscription) return { status: "skipped", error: "no push subscription" };
  try {
    await webpush.sendNotification(
      opts.subscription,
      JSON.stringify({ title: opts.title, body: opts.body, url: opts.url }),
    );
    return { status: "sent" };
  } catch (e: any) {
    logError("sendPush failed", e);
    return { status: "failed", error: e?.message || String(e) };
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
