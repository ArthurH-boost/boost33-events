/**
 * Online events (4 Nov 2026): lives and webinars on TikTok, Whatnot, Zoom,
 * Twitch… The fiche links straight to the platform — no redirect through
 * Boost33, no tracking parameter added. Pure, so it runs on both sides.
 */

export const ONLINE_PLATFORMS = ["tiktok", "whatnot", "zoom", "teams", "meet", "twitch", "youtube", "linkedin", "other"] as const;
export type OnlinePlatform = (typeof ONLINE_PLATFORMS)[number];

/** Brand names, the same in every language. "other" is labelled through i18n. */
export const PLATFORM_NAMES: Record<Exclude<OnlinePlatform, "other">, string> = {
  tiktok: "TikTok Live",
  whatnot: "Whatnot",
  zoom: "Zoom",
  teams: "Microsoft Teams",
  meet: "Google Meet",
  twitch: "Twitch",
  youtube: "YouTube Live",
  linkedin: "LinkedIn Live",
};

const HOSTS: Array<[RegExp, OnlinePlatform]> = [
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)whatnot\.com$/, "whatnot"],
  [/(^|\.)zoom\.(us|com)$/, "zoom"],
  [/(^|\.)teams\.(microsoft|live)\.com$/, "teams"],
  [/^meet\.google\.com$/, "meet"],
  [/(^|\.)twitch\.tv$/, "twitch"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
];

/** The link, if it is a plain http(s) URL; anything else (javascript:, data:, garbage) is refused. */
export function safeUrl(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Which platform a link points to, so the form can pick it for the person. */
export function platformFromUrl(raw: string | null | undefined): OnlinePlatform | null {
  const url = safeUrl(raw);
  if (!url) return null;
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  for (const [re, p] of HOSTS) if (re.test(host)) return p;
  return null;
}

export function isPlatform(v: string | null | undefined): v is OnlinePlatform {
  return (ONLINE_PLATFORMS as readonly string[]).includes(v ?? "");
}
