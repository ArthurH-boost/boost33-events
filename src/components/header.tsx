import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { HUB_URL, type Locale } from "@/lib/config";
import { initials } from "@/lib/initials";

/**
 * The Hub's 56px header: mark, account pill, the page's name, the way back to
 * the Hub, the language switch and who is signed in. Ported from boost33-results.
 */
export async function Header({ accountName, personName, locale, isAdmin }: { accountName: string | null; personName: string; locale: Locale; isAdmin: boolean }) {
  const t = await getTranslations("app");
  const other: Locale = locale === "fr" ? "en" : "fr";
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
        <Link href={`?lang=${other}`} aria-label={t("language")} style={{ fontSize: 12, fontWeight: 600, color: "var(--color-foreground-secondary)", textDecoration: "none", textTransform: "uppercase" }}>
          {other}
        </Link>
        <a href={HUB_URL} className="hidden sm:inline" style={{ fontSize: 13, color: "var(--color-foreground-secondary)", textDecoration: "none", whiteSpace: "nowrap" }}>
          {t("backToHub")}
        </a>
        <span role="img" aria-label={t("signedInAs", { name: personName })} title={personName} style={{ width: 26, height: 26, borderRadius: 99, background: "var(--color-neutral-950)", color: "#FFFFFF", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {initials(personName)}
        </span>
      </nav>
    </header>
  );
}
