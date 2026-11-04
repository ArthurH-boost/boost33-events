import "server-only";
import { Resend } from "resend";
import { APP_URL } from "./config";
import { setting } from "./env";
import type { QueuedNotification } from "./events";
import { km, when } from "./format";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import { PLATFORM_NAMES } from "./online";

/**
 * The "new event near you" email. One provider call per notification; the
 * queue (events_notifications) is what makes it retry-safe, so this file only
 * sends. Swap the provider here and nowhere else.
 *
 * Copy comes from the same messages files as the screens, so FR and EN stay
 * in step (D40). The person's language is trade_members.locale.
 */
const FROM = process.env.MAIL_FROM?.trim() || "Boost33 Events <events@boost33.com>";

export async function sendEventEmail(n: QueuedNotification): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const apiKey = setting("RESEND_API_KEY");
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set" };
  const locale = n.locale === "fr" ? "fr" : "en";
  const m = (locale === "fr" ? fr : en).email;
  const e = n.event;
  const platform = e.online_platform && e.online_platform !== "other" ? PLATFORM_NAMES[e.online_platform] : null;
  const place = e.is_online ? (platform ? (locale === "fr" ? `en ligne sur ${platform}` : `online on ${platform}`) : locale === "fr" ? "en ligne" : "online") : [e.venue_name, e.city].filter(Boolean).join(", ");
  const distance = e.distance_km != null ? km(e.distance_km, locale)!.replace(" km", "") : null;
  const whenText = when(e.starts_at, e.ends_at, locale);
  const url = `${APP_URL}/events/${e.id}`;

  const subject = fill(m.subject, { title: e.title });
  const intro = fill(m.intro, { title: e.title, when: whenText, place, distance: distance ?? "" });
  const network = e.network_going > 0 ? (locale === "fr" ? `${e.network_going} membre${e.network_going > 1 ? "s" : ""} de ton réseau y ${e.network_going > 1 ? "vont" : "va"}.` : `${e.network_going} member${e.network_going > 1 ? "s" : ""} of your network ${e.network_going > 1 ? "are" : "is"} going.`) : "";

  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:#f7f7f8;font-family:Inter,system-ui,sans-serif;color:#1d1d1b">
  <div style="display:none;max-height:0;overflow:hidden">${esc(fill(m.preheader, { when: whenText, place }))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e5ea;border-radius:12px">
      <tr><td style="padding:28px 28px 0">
        <div style="font-size:11px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#6b6b6b">${esc(m.heading)}</div>
        <h1 style="margin:12px 0 8px;font-size:22px;line-height:28px;font-weight:700;letter-spacing:-.02em">${esc(e.title)}</h1>
        <p style="margin:0;font-size:15px;line-height:22px">${esc(intro)}</p>
        ${network ? `<p style="margin:12px 0 0;font-size:14px;line-height:20px;color:#525252">${esc(network)}</p>` : ""}
        ${e.description ? `<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#525252">${esc(e.description.slice(0, 400))}${e.description.length > 400 ? "…" : ""}</p>` : ""}
      </td></tr>
      <tr><td style="padding:24px 28px 28px">
        <a href="${url}" style="display:inline-block;height:40px;line-height:40px;padding:0 18px;border-radius:8px;background:#e9521e;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">${esc(m.cta)}</a>
      </td></tr>
    </table>
    <p style="max-width:520px;margin:16px 0 0;font-size:12px;line-height:16px;color:#8e8e93">${esc(m.footer)}</p>
  </td></tr></table></body></html>`;
  const text = `${m.heading}\n\n${e.title}\n${intro}\n${network ? network + "\n" : ""}\n${m.cta}: ${url}\n\n${m.footer}`;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({ from: FROM, to: n.email, subject, html, text });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send_failed" };
  }
}

/** `{name}` placeholders only — the email strings use no plural/select syntax except `distance`, handled above. */
function fill(template: string, values: Record<string, string>): string {
  return template
    .replace(/\{distance, select, none \{\} other \{([^}]*)\}\}/, values.distance ? "$1" : "")
    .replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
