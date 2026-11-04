/** Dates in Europe/Paris, in the person's language. Pure, so it runs on both sides. */
import type { Locale } from "./config";

export const TIME_ZONE = "Europe/Paris";

const tag = (l: Locale) => (l === "fr" ? "fr-FR" : "en-GB");

/** "6" and "nov" for the date square. */
export function dayMonth(iso: string, locale: Locale): { day: string; month: string } {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat(tag(locale), { timeZone: TIME_ZONE, day: "numeric" }).format(d),
    month: new Intl.DateTimeFormat(tag(locale), { timeZone: TIME_ZONE, month: "short" }).format(d).replace(".", ""),
  };
}

/** "Thu 6 Nov, 18:30" / "jeu. 6 nov., 18:30". With an end on another day: "6 → 7 Nov". */
export function when(startIso: string, endIso: string | null, locale: Locale): string {
  const s = new Date(startIso);
  const dayFmt = new Intl.DateTimeFormat(tag(locale), { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" });
  const timeFmt = new Intl.DateTimeFormat(tag(locale), { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
  const e = endIso ? new Date(endIso) : null;
  const sameDay = e && dayFmt.format(e) === dayFmt.format(s);
  if (e && !sameDay) return `${dayFmt.format(s)} → ${dayFmt.format(e)}`;
  const time = timeFmt.format(s) + (e ? ` → ${timeFmt.format(e)}` : "");
  return `${dayFmt.format(s)} · ${time}`;
}

/** "Thursday 6 November 2026" for the fiche. */
export function longDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export function time(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

/** "2.1 km" / "2,1 km". */
export function km(value: number | null, locale: Locale): string | null {
  if (value == null) return null;
  return `${new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 1 }).format(value)} km`;
}

/** The value a `datetime-local` input wants, in Paris time. */
export function toLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`;
}

/** A `datetime-local` value typed in Paris time → ISO. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
  // Find the UTC instant whose Paris wall-clock is the typed one (handles DST).
  const guess = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  const offset = parisOffsetMinutes(new Date(guess));
  const iso = new Date(guess - offset * 60_000);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

function parisOffsetMinutes(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "shortOffset" }).formatToParts(d);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const m = name.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!m) return 60;
  return Number(m[1]) * 60 + (m[2] ? Number(m[2]) * Math.sign(Number(m[1])) : 0);
}

/** Google Calendar "add" link: no file to download, works everywhere. */
export function calendarLink(e: { title: string; starts_at: string; ends_at: string | null; venue_name?: string | null; address?: string | null; description?: string | null }, pageUrl: string): string {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const end = e.ends_at ?? new Date(new Date(e.starts_at).getTime() + 2 * 3600_000).toISOString();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${fmt(e.starts_at)}/${fmt(end)}`,
    details: `${e.description ?? ""}\n\n${pageUrl}`.trim(),
    location: [e.venue_name, e.address].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
