import { headers } from "next/headers";
import { decideAccess, type Access, type Claims } from "./access";
import { CLAIMS_HEADER, DEFAULT_LOCALE, LOCALES, PREVIEW_HEADER, type Locale } from "./config";
import { setting } from "./env";

/**
 * The session for the page being rendered. The proxy has already verified it
 * and set the header; a page reached without it is a bug, not a guest.
 */
export async function currentSession(): Promise<{ claims: Claims; access: Access; preview: boolean; locale: Locale; isAdmin: boolean }> {
  const h = await headers();
  const raw = h.get(CLAIMS_HEADER);
  if (!raw) throw new Error("No verified session: the proxy did not run for this route.");
  const claims = JSON.parse(decodeURIComponent(raw)) as Claims;
  const preview = h.get(PREVIEW_HEADER) === "1";
  const lang = h.get("x-events-locale");
  const locale: Locale = (LOCALES as readonly string[]).includes(lang ?? "") ? (lang as Locale) : DEFAULT_LOCALE;
  return { claims, access: decideAccess(claims), preview, locale, isAdmin: isAdmin(claims) };
}

/**
 * Who may publish, reject and edit any event: Boost33 staff (the `staff`
 * claim) and the emails listed in ADMIN_EMAILS (comma-separated), so Dezys and
 * Arthur are admins whatever their claims say. The database re-checks nothing
 * here: `events_admin_*` functions take `p_actor` and this app is the gate.
 */
export function isAdmin(claims: Claims, env: Record<string, string | undefined> = process.env): boolean {
  if (claims.staff === true) return true;
  const list = (setting("ADMIN_EMAILS", env) ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return Boolean(claims.email && list.includes(claims.email.toLowerCase()));
}
