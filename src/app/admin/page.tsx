import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { reviewAction } from "@/app/actions";
import { Header } from "@/components/header";
import { BTN_PRIMARY, BTN_SECONDARY, BTN_SMALL, DateSquare, Footer, INPUT, MAIN_CARD, META, ROW_TITLE, Tag, Well } from "@/components/ui";
import { currentSession } from "@/lib/current";
import { adminList } from "@/lib/events";
import { dayMonth, when } from "@/lib/format";
import { PLATFORM_NAMES } from "@/lib/online";

type Status = "pending" | "published" | "rejected";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string; done?: string; queued?: string }> }) {
  const { claims, locale, isAdmin } = await currentSession();
  const t = await getTranslations("admin");
  const tk = await getTranslations("kinds");
  const sp = await searchParams;
  const status: Status = sp.status === "published" || sp.status === "rejected" ? sp.status : "pending";
  const header = <Header accountName={claims.orgName ?? claims.org ?? null} personName={claims.name ?? claims.email ?? "—"} locale={locale} isAdmin={isAdmin} />;

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh" }}>
        {header}
        <Well><p style={{ color: "var(--color-foreground-muted)" }}>{t("notAdmin")}</p><Footer /></Well>
      </div>
    );
  }
  const rows = await adminList(status);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
      {header}
      <Well>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: 36, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: "40px" }}>{t("title")}</h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: "24px", color: "var(--color-foreground-secondary)" }}>{t("subtitle")}</p>
        </div>

        {sp.done && (
          <div role="status" style={{ marginBottom: 24, padding: "12px 16px", borderRadius: 8, background: "var(--color-success-subtle)", color: "var(--color-success)", fontSize: 14, fontWeight: 500 }}>
            {sp.done === "published" ? `${t("published")} · ${t("queued", { count: Number(sp.queued ?? 0) })}` : sp.done === "rejected" ? t("rejected") : t("cancel")}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, paddingBottom: 16 }}>
          {(["pending", "published", "rejected"] as Status[]).map((s) => (
            <Link key={s} href={`/admin?status=${s}`} aria-current={s === status ? "true" : undefined} style={{ display: "inline-flex", alignItems: "center", height: 32, padding: "0 12px", borderRadius: 9999, fontSize: 13, fontWeight: 600, textDecoration: "none", border: `1px solid ${s === status ? "var(--color-neutral-950)" : "var(--color-border-strong)"}`, background: s === status ? "var(--color-neutral-950)" : "var(--color-surface)", color: s === status ? "#FFFFFF" : "var(--color-foreground)" }}>
              {t(s)}
            </Link>
          ))}
        </div>

        <div style={{ ...MAIN_CARD, maxWidth: 960 }}>
          {rows.length === 0 ? (
            <p style={{ margin: 0, padding: 28, fontSize: 14, color: "var(--color-foreground-muted)" }}>{t("empty")}</p>
          ) : (
            rows.map((e, i) => {
              const d = dayMonth(e.starts_at, locale);
              return (
                <div key={e.id} style={{ display: "flex", flexDirection: "column", gap: 14, padding: "18px 28px", borderTop: i === 0 ? undefined : "1px solid var(--color-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <DateSquare day={d.day} month={d.month} />
                    <span style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                      <Link href={`/events/${e.id}`} style={{ ...ROW_TITLE, textDecoration: "none" }}>{e.title}</Link>
                      <span style={META}>
                        {when(e.starts_at, e.ends_at, locale)} · {e.is_online ? (e.online_platform && e.online_platform !== "other" ? PLATFORM_NAMES[e.online_platform] : tk("online")) : [e.venue_name, e.address].filter(Boolean).join(", ")}
                        {e.submitted_name ? ` · ${t("by", { name: e.submitted_name })}` : ""}{e.submitted_email ? ` (${e.submitted_email})` : ""}
                      </span>
                      {e.online_url && <a href={e.online_url} target="_blank" rel="noopener noreferrer" style={{ ...META, textDecoration: "underline" }}>{t("liveLink")}: {e.online_url}</a>}
                      {e.source_url && <a href={e.source_url} target="_blank" rel="noreferrer" style={{ ...META, textDecoration: "underline" }}>{t("source")}: {e.source_url}</a>}
                    </span>
                    <Tag>{tk(e.kind)}</Tag>
                  </div>
                  {e.description && <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "var(--color-foreground-secondary)", whiteSpace: "pre-line", maxHeight: 120, overflow: "auto" }}>{e.description}</p>}
                  <form action={reviewAction} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="id" value={e.id} />
                    <input name="note" type="text" placeholder={t("note")} style={{ ...INPUT, height: 36, flex: "1 1 240px", width: "auto" }} />
                    {status !== "published" && <button type="submit" name="decision" value="published" style={BTN_PRIMARY}>{t("publish")}</button>}
                    {status === "pending" && <button type="submit" name="decision" value="rejected" style={BTN_SECONDARY}>{t("reject")}</button>}
                    {status === "published" && <button type="submit" name="decision" value="cancelled" style={BTN_SMALL}>{t("cancel")}</button>}
                  </form>
                </div>
              );
            })
          )}
        </div>
        <Footer />
      </Well>
    </div>
  );
}
