import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HUB_URL, type Locale } from "@/lib/config";
import { initials } from "@/lib/initials";

/*
 * The Hub's 56px header, as boost33-hub/src/app/hub-view.tsx `Header` draws it:
 * mark (26px, no wordmark) · divider · account pill · divider · the page's name
 * on the left; the two 32px squares (Inbox, Notifications — same glyphs as
 * boost33-hub/src/app/header-actions.tsx) and the 26px avatar on the right.
 *
 * Inbox and notifications live in the Hub (its /inbox page and bell menu), so
 * the squares are links there: one product, several apps. The language switch
 * is this app's own, as in Outbound.
 */
const SQUARE = {
  position: "relative" as const,
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-foreground)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  flexShrink: 0,
  textDecoration: "none",
};

const INBOX_PATHS = ["M4 13h3l3 3h4l3 -3h3", "M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"];
const BELL_PATHS = ["M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6", "M9 17v1a3 3 0 0 0 6 0v-1"];

function Glyph({ paths }: { paths: string[] }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      {paths.map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

export async function Header({ accountName, personName, locale, isAdmin }: { accountName: string | null; personName: string; locale: Locale; isAdmin: boolean }) {
  const t = await getTranslations("app");
  const other: Locale = locale === "fr" ? "en" : "fr";
  const hub = HUB_URL.replace(/\/$/, "");
  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-8" style={{ height: 56, borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
      <div className="flex min-w-0 items-center gap-3 sm:gap-[18px]">
        <a href={HUB_URL} aria-label="Boost33 — Hub" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <Image src="/boost33-mark.png" alt="" width={26} height={26} priority />
        </a>
        {accountName && (
          <>
            <div aria-hidden="true" className="hidden sm:block" style={{ width: 1, height: 20, flexShrink: 0, background: "var(--color-border)" }} />
            <div className="hidden min-w-0 sm:flex" style={{ alignItems: "center", gap: 8, height: 32, padding: "0 11px", border: "1px solid var(--color-border-strong)", borderRadius: 6 }}>
              <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 5, background: "var(--color-neutral-950)", color: "#FFFFFF", fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {initials(accountName)}
              </span>
              <span className="truncate" style={{ fontSize: 13, fontWeight: 600 }}>{accountName}</span>
            </div>
          </>
        )}
        <div aria-hidden="true" style={{ width: 1, height: 20, flexShrink: 0, background: "var(--color-border)" }} />
        <Link href="/" style={{ fontSize: 13, fontWeight: 600, color: "inherit", textDecoration: "none" }}>{t("name")}</Link>
        {isAdmin && (
          <Link href="/admin" className="hidden sm:inline" style={{ fontSize: 13, color: "var(--color-foreground-secondary)", textDecoration: "none" }}>Admin</Link>
        )}
      </div>

      <nav aria-label="Account" className="flex shrink-0 items-center gap-3 sm:gap-[18px]">
        <a href={`?lang=${other}`} aria-label={t("language")} style={{ fontSize: 12, fontWeight: 600, color: "var(--color-foreground-secondary)", textDecoration: "none", textTransform: "uppercase" }}>
          {other}
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href={`${hub}/inbox`} aria-label="Inbox" title="Inbox" style={SQUARE}>
            <Glyph paths={INBOX_PATHS} />
          </a>
          <a href={HUB_URL} aria-label="Notifications" title="Notifications" style={SQUARE}>
            <Glyph paths={BELL_PATHS} />
          </a>
        </div>
        <a href={HUB_URL} aria-label={t("signedInAs", { name: personName })} title={`${personName} · ${t("backToHub")}`} style={{ width: 26, height: 26, borderRadius: 99, background: "var(--color-neutral-950)", color: "#FFFFFF", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textDecoration: "none" }}>
          {initials(personName)}
        </a>
      </nav>
    </header>
  );
}
