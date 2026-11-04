import { headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/config";

/**
 * next-intl without locale prefixes in the URL (D40): the proxy decides the
 * language from `?lang=` or the cookie and passes it in a header. EN is the
 * default locale, as in Outbound.
 */
export default getRequestConfig(async () => {
  const h = await headers();
  const asked = h.get("x-events-locale");
  const locale: Locale = (LOCALES as readonly string[]).includes(asked ?? "") ? (asked as Locale) : DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Europe/Paris",
  };
});
