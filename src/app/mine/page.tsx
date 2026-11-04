import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/header";
import { Chevron, DateSquare, Footer, MAIN_CARD, META, ROW_TITLE, Tag, Well } from "@/components/ui";
import { currentSession } from "@/lib/current";
import { eventsNear } from "@/lib/events";
import { dayMonth, km, when } from "@/lib/format";

/** The events the person said they are going to, upcoming, plus the ones they proposed. */
export default async function MinePage() {
  const { claims, locale, isAdmin } = await currentSession();
  const t = await getTranslations("home");
  const tk = await getTranslations("kinds");
  const near = await eventsNear(claims.sub, null);
  const going = near.events.filter((e) => e.me_going);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
      <Header accountName={claims.orgName ?? claims.org ?? null} personName={claims.name ?? claims.email ?? "—"} locale={locale} isAdmin={isAdmin} />
      <Well>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--color-foreground-secondary)", textDecoration: "none", paddingBottom: 20 }}>← {t("title")}</Link>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: 36, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: "40px", paddingBottom: 32 }}>{t("myRegistrations", { count: going.length })}</h1>
        <div style={{ ...MAIN_CARD, maxWidth: 820 }}>
          {going.length === 0 ? (
            <p style={{ margin: 0, padding: 28, fontSize: 14, color: "var(--color-foreground-muted)" }}>—</p>
          ) : (
            going.map((e, i) => {
              const d = dayMonth(e.starts_at, locale);
              return (
                <Link key={e.id} href={`/events/${e.id}`} style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 28px", borderTop: i === 0 ? undefined : "1px solid var(--color-border)", textDecoration: "none", color: "inherit" }}>
                  <DateSquare day={d.day} month={d.month} />
                  <span style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={ROW_TITLE}>{e.title}</span>
                    <span style={META}>{when(e.starts_at, e.ends_at, locale)} · {e.is_online ? tk("online") : [e.venue_name ?? e.city, km(e.distance_km, locale)].filter(Boolean).join(" · ")}</span>
                  </span>
                  <Tag>{tk(e.kind)}</Tag>
                  <Chevron />
                </Link>
              );
            })
          )}
        </div>
        {near.mine.length > 0 && (
          <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--color-foreground-muted)" }}>{t("mine")} :</span>
            {near.mine.map((m) => (
              <Link key={m.id} href={`/events/${m.id}`} style={{ textDecoration: "none" }}>
                <Tag tone={m.status === "published" ? "success" : m.status === "pending" ? "warning" : "neutral"}>{m.title}{m.status === "pending" ? ` · ${t("pending")}` : ""}</Tag>
              </Link>
            ))}
          </div>
        )}
        <Footer />
      </Well>
    </div>
  );
}
