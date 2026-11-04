/**
 * Read an event page (Eventbrite, Luma, Meetup, HelloAsso, a LinkedIn event…)
 * and pull what it says about itself: schema.org `Event` JSON-LD first, then
 * OpenGraph / meta tags as a fallback. Pure parsing, no network: `fetchEventPage`
 * does the fetch and is the only server-only piece.
 *
 * Nothing here is trusted: it is a pre-fill the person reviews, then an admin
 * reviews again. Strings are trimmed and capped; HTML is stripped from the
 * description.
 */
export type Prefill = {
  title?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  is_online?: boolean;
  venue_name?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  organiser?: string;
  image_url?: string;
  ticket_url?: string;
  price?: "free" | "paid";
};

const cap = (s: unknown, n: number): string | undefined => {
  if (typeof s !== "string") return undefined;
  const t = decodeEntities(s).replace(/\s+/g, " ").trim();
  return t ? t.slice(0, n) : undefined;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

const stripHtml = (s: string) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "");

function toIso(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

type Json = Record<string, unknown>;
const asObj = (v: unknown): Json | undefined => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : undefined);
const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);

/** Every JSON-LD block on the page, flattened (@graph included). */
export function jsonLdBlocks(html: string): Json[] {
  const out: Json[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1]!.trim()) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const o = asObj(item);
        if (!o) continue;
        if (Array.isArray(o["@graph"])) for (const g of o["@graph"] as unknown[]) { const go = asObj(g); if (go) out.push(go); }
        else out.push(o);
      }
    } catch {
      // Not JSON: skip the block.
    }
  }
  return out;
}

function isEvent(o: Json): boolean {
  const t = o["@type"];
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => typeof x === "string" && /Event$/.test(x));
}

export function fromJsonLd(html: string): Prefill | null {
  const ev = jsonLdBlocks(html).find(isEvent);
  if (!ev) return null;
  const p: Prefill = {};
  p.title = cap(ev.name, 160);
  const desc = typeof ev.description === "string" ? stripHtml(ev.description) : undefined;
  p.description = desc ? decodeEntities(desc).replace(/\n{3,}/g, "\n\n").trim().slice(0, 4000) : undefined;
  p.starts_at = toIso(ev.startDate);
  p.ends_at = toIso(ev.endDate);
  p.image_url = cap(first(ev.image), 500) ?? cap(asObj(first(ev.image))?.url, 500);
  p.ticket_url = cap(ev.url, 500);
  const organiser = asObj(first(ev.organizer));
  p.organiser = cap(organiser?.name, 160);
  const mode = typeof ev.eventAttendanceMode === "string" ? ev.eventAttendanceMode : "";
  const loc = asObj(first(ev.location));
  const locType = typeof loc?.["@type"] === "string" ? (loc["@type"] as string) : "";
  if (/Online/i.test(mode) || /VirtualLocation/i.test(locType)) p.is_online = true;
  if (loc && !p.is_online) {
    p.venue_name = cap(loc.name, 160);
    const addr = asObj(loc.address);
    if (addr) {
      const parts = [addr.streetAddress, addr.postalCode, addr.addressLocality].map((x) => cap(x, 120)).filter(Boolean);
      p.address = parts.join(", ") || undefined;
      p.city = cap(addr.addressLocality, 80);
    } else if (typeof loc.address === "string") {
      p.address = cap(loc.address, 300);
    }
    const geo = asObj(loc.geo);
    const lat = Number(geo?.latitude), lng = Number(geo?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) { p.lat = lat; p.lng = lng; }
  }
  const offer = asObj(first(ev.offers));
  if (offer) {
    const price = Number(offer.price);
    p.price = Number.isFinite(price) && price > 0 ? "paid" : "free";
    if (!p.ticket_url) p.ticket_url = cap(offer.url, 500);
  }
  return p;
}

function meta(html: string, name: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i");
  return (html.match(re) ?? html.match(re2))?.[1];
}

export function fromMeta(html: string): Prefill {
  const p: Prefill = {};
  p.title = cap(meta(html, "og:title") ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1], 160);
  p.description = cap(meta(html, "og:description") ?? meta(html, "description"), 4000);
  p.image_url = cap(meta(html, "og:image"), 500);
  p.starts_at = toIso(meta(html, "event:start_time") ?? meta(html, "og:start_time"));
  p.ends_at = toIso(meta(html, "event:end_time") ?? meta(html, "og:end_time"));
  return p;
}

/** JSON-LD wins; meta tags fill the gaps. The page URL becomes the source. */
export function parseEventPage(html: string, url: string): Prefill {
  const ld = fromJsonLd(html) ?? {};
  const og = fromMeta(html);
  const merged: Prefill = { ...og, ...Object.fromEntries(Object.entries(ld).filter(([, v]) => v !== undefined)) };
  if (!merged.ticket_url) merged.ticket_url = url;
  return merged;
}

/** Only http(s), never a private host: this fetch runs on our server. */
export function safeEventUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || /^(\d+\.){3}\d+$/.test(host) || host.endsWith(".local") || host.endsWith(".internal") || host.includes(":")) return null;
  return u;
}
