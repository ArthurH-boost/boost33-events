/**
 * What Boost Results sends Sentry, decided here and nowhere else (B33-1606).
 *
 * Copied from identity's `src/lib/sentry.ts` (B33-1599) and the Hub's (B33-1601),
 * themselves boostscore's `lib/observability/sentry.ts` made stricter. Score's copy
 * carries the history of every hole found in it (JFL-364: cookies reach Sentry
 * whatever `sendDefaultPii` says; the `Authorization` header by the same door).
 * A Sentry issue is copied into every email and Slack message wired to it, so
 * nothing on an event may be something we would not paste into Slack.
 *
 * What this app adds:
 *
 * - **Its own credentials.** The Supabase JWT secret it signs a one-minute
 *   `service_role` token with, Outbound's service-role key, the anon key, and
 *   Score's key, sent as `Authorization: Bearer`. supabase-js also sends the key
 *   as an `apikey` header. Headers are stripped by name; the setting names are on
 *   the forbidden list in case a whole env or config object reaches a scope.
 * - **`x-events-claims`.** The proxy hands the verified session to the page in
 *   this header, and it holds the person's name and email. Stripped like a cookie.
 * - **The person's results.** Leads and replies (name, company, snippet,
 *   campaign), introductions (contact name, need), Score's suppliers and savings,
 *   Financing's amounts. Dropped by key, at any depth.
 *
 * There is no token-path rule: this app has one page, `/`, and no route segment
 * is a bearer capability.
 *
 * Plain data and pure functions, no import of `@sentry/nextjs`: unit-testable
 * without a runtime and safe on the Edge.
 */

/**
 * Keys that never leave this app on a Sentry event, matched case-insensitively and
 * at any depth. A key-name filter: see `redactString` for what it cannot catch.
 * The first block is identity's list; the second, the names this app holds its
 * credentials under (`env.ts`); the third, the person's own results as the
 * sources return them (`sources/*.ts`, `funding/profile.ts`).
 */
export const FORBIDDEN_KEYS = new Set([
  "sessionid",
  "actorsessionid",
  "sid",
  "session",
  "email",
  "emails",
  "code",
  "otp",
  "passphrase",
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "apikey",
  "servicekey",

  "b33_sid",
  "b33_ctx",
  "supabase_jwt_secret",
  "supabase_jwt_key",
  "supabase_anon_key",
  "outbound_supabase_service_role_key",
  "score_api_key",
  "jwtsecret",
  "anonkey",
  "servicerolekey",

  "orgname",
  "org_name",
  "company",
  "contactname",
  "contact_name",
  "need",
  "snippet",
  "qualification",
  "campaign",
  "supplier",
  "amount",
  "amounttext",
  "funded",
  "rest",
  "waitingsavingslowcents",
  "waitingsavingshighcents",
  "savingslowcents",
  "savingshighcents",
]);

/**
 * `name` is a person's or a lead's name everywhere this app puts it (claims,
 * Outbound replies, dossiers), but the SDK's own `sdk` and `contexts` (os,
 * browser, runtime) use it for themselves. So it is dropped everywhere except
 * under those two.
 */
const NAME_KEYS = new Set(["name"]);
const SDK_OWNED = new Set(["sdk", "contexts"]);

/**
 * The request headers that carry a credential or the session. Stripped by name,
 * so a new call is covered without remembering to.
 */
const CREDENTIAL_HEADERS = new Set([
  "cookie",
  "authorization",
  "proxy-authorization",
  "x-service-key",
  "apikey",
  "x-events-claims",
  "x-vercel-protection-bypass",
]);

/** The query string (and fragment) of anything URL-shaped, up to whitespace or a closing quote. */
const URL_QUERY = /(\bhttps?:\/\/[^\s?#"']*|(?:^|\s)\/[^\s?#"']*)[?#][^\s"']*/g;
/**
 * Both parts exclude `/ ? & = #`, so an address can never match across a URL's
 * structure: with them allowed, `https://host/p?invite=a@b.com&tab=x` matched
 * from `//host` to `.com` and left `&tab=x` behind (found on the Hub's copy).
 */
const EMAIL = /[^\s@"'<>()[\],;:/?&=#]+@[^\s@"'<>()[\],;:/?&=#]+\.[a-z]{2,}/gi;
/** Three base64url segments with a JSON header: a JWT, signed or not. `b33_ctx`, the service token and the anon key are all one. */
const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]*/g;
/** A bearer credential written into free text, as a fetch error or a header dump would. */
const BEARER = /\b(Bearer\s+)[^\s"',;]+/gi;
/** Supabase's newer key format, which is not a JWT. */
const SUPABASE_KEY = /\bsb_(?:secret|publishable)_[\w-]+/g;

/**
 * Redact what a key filter cannot see inside free text: query strings, email
 * addresses, JWTs and bearer credentials. Query strings go first, so whatever a
 * URL carries (the sign-in `return` link, a preview's `?as=`) is dropped whole
 * before a narrower pattern can match part of it and leave the rest behind.
 */
export function redactString(value: string): string {
  return value
    .replace(URL_QUERY, "$1")
    .replace(EMAIL, "[email]")
    .replace(JWT, "[jwt]")
    .replace(BEARER, "$1[redacted]")
    .replace(SUPABASE_KEY, "[supabase-key]");
}

/**
 * Reporting is on exactly when a non-blank DSN is configured that is not a loopback
 * placeholder, as in Score (B33-976): a loopback ingest host is never a real Sentry
 * endpoint, and treating it as "on" fills the browser console with refused POSTs.
 */
export function sentryEnabled(dsn: string | undefined): boolean {
  if (!dsn || !dsn.trim()) return false;
  return !isLoopbackDsn(dsn);
}

function isLoopbackDsn(dsn: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(dsn.trim()).hostname;
  } catch {
    return false;
  }
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1") return true;
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

export type SentryBaseOptions = {
  dsn: string | undefined;
  enabled: boolean;
  environment: string | undefined;
  sendDefaultPii: false;
  beforeSend: typeof scrubSentryEvent;
  beforeBreadcrumb: typeof scrubBreadcrumb;
};

/**
 * The init options every runtime shares. No DSN means `{ enabled: false }` and
 * `Sentry.init` is a no-op rather than a throw, so local dev, the tests and an
 * unconfigured preview report nothing. No `tracesSampleRate` and no Replay: errors
 * only (B33-1597).
 */
export function baseSentryOptions(dsn: string | undefined): SentryBaseOptions {
  const enabled = sentryEnabled(dsn);
  return {
    dsn: enabled ? dsn : undefined,
    enabled,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}

/**
 * The last line of defence, run on every event on its way out: whatever a capture
 * site put on the scope, and whatever the SDK attached by itself, no credential,
 * address or result reaches Sentry. Mutates and returns the event, as `beforeSend`
 * expects.
 */
export function scrubSentryEvent<T extends object>(event: T): T {
  scrubRequest(event as Record<string, unknown>);
  const seen = new Set<object>();
  const record = event as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (SDK_OWNED.has(key)) {
      scrub(record[key], seen, false);
      continue;
    }
    if (isForbidden(key, true)) {
      delete record[key];
      continue;
    }
    const child = record[key];
    if (typeof child === "string") record[key] = redactString(child);
    else scrub(child, seen, true);
  }
  return event;
}

/**
 * Console breadcrumbs are dropped outright. The sources' `console.error` lines are
 * written for Vercel's log drain, and a breadcrumb is the one path by which a log
 * line would travel to a third party. Every other breadcrumb is kept and scrubbed
 * like the event.
 */
export function scrubBreadcrumb<T extends { category?: string }>(breadcrumb: T): T | null {
  if (breadcrumb.category === "console") return null;
  scrub(breadcrumb, new Set(), true);
  return breadcrumb;
}

function scrubRequest(event: Record<string, unknown>): void {
  const request = event.request;
  if (!request || typeof request !== "object") return;
  const req = request as Record<string, unknown>;
  delete req.cookies;
  delete req.data;
  delete req.query_string;

  const headers = req.headers;
  if (headers && typeof headers === "object") {
    for (const key of Object.keys(headers)) {
      if (CREDENTIAL_HEADERS.has(key.toLowerCase())) {
        delete (headers as Record<string, unknown>)[key];
      }
    }
  }
}

function isForbidden(key: string, names: boolean): boolean {
  const k = key.toLowerCase();
  return FORBIDDEN_KEYS.has(k) || CREDENTIAL_HEADERS.has(k) || (names && NAME_KEYS.has(k));
}

function scrub(value: unknown, seen: Set<object>, names: boolean): void {
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!Array.isArray(value) && isForbidden(key, names)) {
      delete record[key];
      continue;
    }
    const child = record[key];
    if (typeof child === "string") record[key] = redactString(child);
    else scrub(child, seen, names);
  }
}

/**
 * The capture context an error boundary hands `captureException`, so the `digest`
 * on the error page joins it to the Sentry event (Score's JFL-367).
 */
export function captureContextForDigest(
  digest: string | undefined,
): { tags: { digest: string } } | undefined {
  return digest ? { tags: { digest } } : undefined;
}
