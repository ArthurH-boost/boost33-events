import { NextResponse, type NextRequest } from "next/server";
import { asFakeMode, fakeSessionAllowed, signinUrl, type Claims } from "@/lib/access";
import {
  APP_URL,
  CLAIMS_HEADER,
  CTX_COOKIE,
  DEFAULT_LOCALE,
  ID_URL,
  LOCALES,
  LOCALE_COOKIE,
  PREVIEW_COOKIE,
  PREVIEW_HEADER,
  SID_COOKIE,
  type Locale,
} from "@/lib/config";
import { fakeSession, refreshSession, verifyCtx } from "@/lib/session";

/**
 * Every page goes through here. There is no login screen in this app
 * (Identity contract §1): no session means a trip to id.boost33.com.
 *
 * Any signed-in member may enter. Copied from boost33-results/src/proxy.ts,
 * plus the language cookie: `?lang=fr` / `?lang=en` is remembered.
 *
 * Two routes are NOT behind the session, because other systems call them with
 * a key of their own: `/api/hub-widget` (the Hub) and `/api/cron/*` (Vercel).
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  let claims: Claims | null = null;
  const setCookies: string[] = [];
  let preview = false;
  const secure = request.nextUrl.protocol === "https:" ? "; Secure" : "";

  // Language: query wins, then cookie, then the default (EN).
  const langQuery = request.nextUrl.searchParams.get("lang");
  const langAsked = (LOCALES as readonly string[]).includes(langQuery ?? "") ? (langQuery as Locale) : null;
  const cookieLang = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale: Locale = langAsked ?? ((LOCALES as readonly string[]).includes(cookieLang ?? "") ? (cookieLang as Locale) : DEFAULT_LOCALE);
  if (langAsked) setCookies.push(`${LOCALE_COOKIE}=${langAsked}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`);

  if (fakeSessionAllowed({ VERCEL_ENV: process.env.VERCEL_ENV, NODE_ENV: process.env.NODE_ENV })) {
    // Preview / local dev: ?as=sales|broker|client switches the simulated
    // person and is remembered in a cookie so navigation keeps it.
    const fromQuery = asFakeMode(request.nextUrl.searchParams.get("as"));
    const mode =
      fromQuery ??
      asFakeMode(request.cookies.get(PREVIEW_COOKIE)?.value) ??
      asFakeMode(process.env.EVENTS_DEV_SESSION) ??
      "client";
    claims = fakeSession(mode);
    preview = true;
    if (fromQuery) setCookies.push(`${PREVIEW_COOKIE}=${mode}; Path=/; SameSite=Lax; HttpOnly${secure}`);
  } else {
    const ctx = request.cookies.get(CTX_COOKIE)?.value;
    claims = ctx ? await verifyCtx(ctx) : null;

    if (!claims && request.cookies.get(SID_COOKIE)) {
      const refreshed = await refreshSession(request.headers.get("cookie") ?? "");
      if (refreshed) {
        claims = refreshed.claims;
        setCookies.push(...refreshed.setCookies);
      }
    }
  }

  if (!claims) {
    return NextResponse.redirect(signinUrl(ID_URL, `${APP_URL}${pathname}${search}`));
  }

  // Hand the verified claims to the pages. Always overwritten (or removed), so
  // a header sent by the browser can never pose as a session or as a preview.
  const headers = new Headers(request.headers);
  headers.set(CLAIMS_HEADER, encodeURIComponent(JSON.stringify(claims)));
  headers.set("x-events-locale", locale);
  if (preview) headers.set(PREVIEW_HEADER, "1");
  else headers.delete(PREVIEW_HEADER);
  return withCookies(NextResponse.next({ request: { headers } }), setCookies);
}

function withCookies(response: NextResponse, setCookies: string[]): NextResponse {
  for (const cookie of setCookies) response.headers.append("set-cookie", cookie);
  return response;
}

export const config = {
  matcher: ["/((?!api/hub-widget|api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico)$).*)"],
};
