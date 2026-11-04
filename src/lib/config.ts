import { setting } from "./env";

/**
 * Where Boost Events lives and who it trusts.
 *
 * APP_URL builds the `return` link sent to Identity. It comes from config,
 * never from the request's Host header, so a forged header cannot turn sign-in
 * into a link to somebody else's site.
 */
export const ID_URL = (setting("IDENTITY_URL") ?? "https://id.boost33.com").replace(/\/$/, "");
export const APP_URL = (process.env.APP_URL ?? "https://events.boost33.com").replace(/\/$/, "");
/** Same default as boost33-trade's HUB_URL. */
export const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL?.trim() || "https://app.boost33.com/";

/** The name this app gives itself when calling another Boost33 service. */
export const APP_NAME = "boostevents";
/** The product slug that marks somebody as a broker (B33-1158). */
export const BROKERS_PRODUCT = "brokers";

/** Pinned when verifying b33_ctx — see the Identity contract §3.2. */
export const ISSUER = "https://id.boost33.com";
export const AUDIENCE = "boost33";
export const ALG = "ES256";

export const SID_COOKIE = "b33_sid";
export const CTX_COOKIE = "b33_ctx";

/** Header the proxy sets with verified claims. Always overwritten, never trusted from the browser. */
export const CLAIMS_HEADER = "x-events-claims";

/** Preview / local dev only: marks a simulated session, and remembers which one. */
export const PREVIEW_HEADER = "x-events-preview";
export const PREVIEW_COOKIE = "events_preview_as";

/** The person's language. Set by the switch in the header, read by next-intl. EN is the default locale. */
export const LOCALE_COOKIE = "events_locale";
export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Default search radius around the member's city, in km. The member can change it. */
export const DEFAULT_RADIUS_KM = 25;
export const RADIUS_OPTIONS_KM = [10, 25, 50, 100] as const;

/** The kinds of events. Stored as these slugs; labelled through i18n. */
export const EVENT_KINDS = ["networking", "startup", "conference", "trade_show", "meetup", "online"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
