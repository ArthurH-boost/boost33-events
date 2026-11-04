import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/header";
import { NewEventForm } from "@/components/new-event-form";
import { Footer, Well } from "@/components/ui";
import { currentSession } from "@/lib/current";
import { locationGet } from "@/lib/events";

export default async function NewEventPage() {
  const { claims, locale, isAdmin } = await currentSession();
  const t = await getTranslations("new");
  const location = await locationGet(claims.sub);
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
      <Header accountName={claims.orgName ?? claims.org ?? null} personName={claims.name ?? claims.email ?? "—"} locale={locale} isAdmin={isAdmin} />
      <Well>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--color-foreground-secondary)", textDecoration: "none", paddingBottom: 20 }}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          Events
        </Link>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingBottom: 40 }}>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: 36, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: "40px" }}>{t("title")}</h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: "24px", color: "var(--color-foreground-secondary)", maxWidth: 640 }}>{t("subtitle")}</p>
        </div>
        <NewEventForm locale={locale} isAdmin={isAdmin} memberLocation={location} />
        <Footer />
      </Well>
    </div>
  );
}
