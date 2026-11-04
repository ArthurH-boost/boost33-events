/** Dates and times, always shown in Europe/Paris whatever the server's zone. */
export const TIME_ZONE = "Europe/Paris";

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const shortFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "numeric", month: "short" });
const longFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "numeric", month: "short", year: "numeric" });

/** The calendar day in Paris, as YYYY-MM-DD. */
export function parisDay(date: Date): string {
  return dayFmt.format(date);
}

/** A parsed date, or null when the string is not a readable date. */
export function readDate(iso: unknown): Date | null {
  if (typeof iso !== "string" || iso === "") return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Shift a YYYY-MM-DD day by whole days. Pure calendar arithmetic, no time zone involved. */
export function shiftDay(day: string, by: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + by)).toISOString().slice(0, 10);
}

/** The last `n` Paris days ending today, oldest first. */
export function lastParisDays(now: Date, n: number): string[] {
  const today = parisDay(now);
  return Array.from({ length: n }, (_, i) => shiftDay(today, i - (n - 1)));
}

/** "14:32" for today (Paris), "7 Oct" this year, "7 Oct 2025" otherwise. */
export function formatWhen(iso: string, now: Date): string {
  const d = readDate(iso);
  if (!d) return "";
  if (parisDay(d) === parisDay(now)) return timeFmt.format(d);
  return parisDay(d).slice(0, 4) === parisDay(now).slice(0, 4) ? shortFmt.format(d) : longFmt.format(d);
}

/** "7 Oct" for a YYYY-MM-DD day. */
export function formatDay(day: string): string {
  const d = readDate(`${day}T12:00:00Z`);
  return d ? shortFmt.format(d) : "";
}
