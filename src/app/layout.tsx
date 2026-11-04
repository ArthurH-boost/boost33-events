import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

/*
 * Inter (text) and Outfit (headings, figures), as in the Hub — loaded through
 * next/font from the npm packages rather than from Google, so a build never
 * depends on reaching fonts.googleapis.com (same reason as boost33-results).
 */
const inter = localFont({
  src: [
    { path: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", style: "normal" },
    { path: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-italic.woff2", style: "italic" },
  ],
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});
const outfit = localFont({
  src: "../../node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Events — Boost33",
  description: "Business, startup and networking events around Boost33 members.",
  // Everything behind this URL is for signed-in members: nothing for a search engine.
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${inter.variable} ${outfit.variable}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
