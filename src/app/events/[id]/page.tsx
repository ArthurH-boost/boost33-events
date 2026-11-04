import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/header";
import { EventsMap } from "@/components/events-map";
import { RsvpButton } from "@/components/rsvp-button";
import { BTN_PRIMARY, BTN_SECONDARY, BTN_SMALL, CARD, Eyebrow, Footer, MAIN_CARD, META, ROW_TITLE, Row, Tag, Well } from "@/components/ui";
import { APP_URL } from "@/lib/config";
import { currentSession } from "@/lib/current";
import { eventGet } from "@/lib/events";
import { calendarLink, km, longDate, time } from "@/lib/format";
import { initials } from "@/lib/initials";
import { PLATFORM_NAMES } from "@/lib/online";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { claims, locale, isAdmin } = await currentSession();
  const t = await getTranslations("event");
  const tk = await getTranslations("kinds");
  const tp = await getTranslations("price");
  const e = await eventGet(id, claims.sub, isAdmin);

  const header = <Header accountName={claims.orgName ?? claims.org ?? null} personName={claims.name ?? claims.email ?? "—"} locale={locale} isAdmin={isAdmin} />;
  if (!e) {
    return (
      <div style={{ minHeight: "100vh" }}>
        {header}
        <Well>
          <Link href="/" style={{ fontSize: 13, color: "var(--color-foreground-secondary)", textDecoration: "none" }}>← {t("back")}</Link>
          <p style={{ marginTop: 24, color: "var(--color-foreground-muted)" }}>{t("notFound")}</p>
          <Footer />
        </Well>
      </div>
    );
  }

  // Online: the platform's own name ("Twitch"), and its link as is — straight to the platform, nothing through Boost33.
  const platform = e.online_platform && e.online_platform !== "other" ? PLATFORM_NAMES[e.online_platform] : null;
  const joinUrl = e.is_online ? (e.online_url ?? e.ticket_url) : null;
  const joinLabel = platform ? t("joinOn", { platform }) : t("joinOnline");
  const place = e.is_online ? (platform ?? t("online")) : [e.venue_name, e.city].filter(Boolean).join(", ");
  const dist = km(e.distance_km, locale);
  const pageUrl = `${APP_URL}/events/${e.id}`;
  const directions = e.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(e.address)}` : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
      {header}
      <Well>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--color-foreground-secondary)", textDecoration: "none", paddingBottom: 20 }}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          {t("back")}
        </Link>

        {e.status === "pending" && <Banner>{t("pendingBanner")}</Banner>}
        {e.status === "rejected" && <Banner>{t("rejectedBanner", { note: e.review_note ?? "" })}</Banner>}

        <div className="flex flex-wrap items-end justify-between gap-4" style={{ paddingBottom: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Tag>{tk(e.kind)}</Tag>
              <Tag>{tp(e.price)}</Tag>
              {dist && <Tag>{dist}</Tag>}
              {e.is_online && <Tag tone="primary">{platform ?? t("online")}</Tag>}
              {e.brokers_only && <Tag tone="primary">Brokers</Tag>}
            </div>
            <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: 36, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: "40px" }}>{e.title}</h1>
            <p style={{ margin: 0, fontSize: 16, lineHeight: "24px", color: "var(--color-foreground-secondary)" }}>
              {longDate(e.starts_at, locale)} · {time(e.starts_at, locale)}{e.ends_at ? ` → ${time(e.ends_at, locale)}` : ""} · {place}{e.organiser ? ` · ${e.organiser}` : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {joinUrl && <a href={joinUrl} target="_blank" rel="noopener noreferrer" style={BTN_PRIMARY}>{joinLabel} ↗</a>}
            <a href={calendarLink(e, pageUrl)} target="_blank" rel="noreferrer" style={BTN_SECONDARY}>{t("addToCalendar")}</a>
            {e.status === "published" && <RsvpButton eventId={e.id} initialGoing={e.me_going} initialCount={e.going} />}
          </div>
        </div>

        <Row
          main={
            <>
              <div>
                <Eyebrow right={e.network.length > 0 ? t("networkHint") : undefined}>{t("networkTitle")} · {t("networkCount", { count: e.network.length })}</Eyebrow>
                <div style={MAIN_CARD}>
                  {e.network.length === 0 ? (
                    <p style={{ margin: 0, padding: 28, fontSize: 14, color: "var(--color-foreground-muted)" }}>{t("registered", { count: e.going })}</p>
                  ) : (
                    e.network.map((m, i) => (
                      <div key={m.person_id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 28px", borderTop: i === 0 ? undefined : "1px solid var(--color-border)" }}>
                        <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 99, background: "var(--color-neutral-950)", color: "#FFFFFF", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials(m.name ?? "?")}</span>
                        <span style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={ROW_TITLE}>{m.name ?? "—"}{m.org ? <span style={{ fontWeight: 400, color: "var(--color-foreground-muted)" }}> · {m.org}</span> : null}</span>
                          <span style={META}>{m.role}</span>
                        </span>
                        <a href={`mailto:?subject=${encodeURIComponent(e.title)}`} style={BTN_SMALL}>{t("message")}</a>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {(e.description || e.image_url) && (
                <div>
                  <Eyebrow>{t("about")}</Eyebrow>
                  <div style={{ ...CARD, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
                    {e.image_url && (
                      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 7", borderRadius: 8, overflow: "hidden", background: "var(--color-neutral-100)" }}>
                        <Image src={e.image_url} alt="" fill sizes="(max-width: 900px) 100vw, 700px" style={{ objectFit: "cover" }} unoptimized />
                      </div>
                    )}
                    {e.description && <p style={{ margin: 0, lineHeight: "22px", whiteSpace: "pre-line" }}>{e.description}</p>}
                  </div>
                </div>
              )}
            </>
          }
          rail={
            <>
              <Eyebrow>{t("place")}</Eyebrow>
              <div style={{ ...CARD, overflow: "hidden" }}>
                {!e.is_online && e.lat != null && e.lng != null && (
                  <div style={{ margin: -1 }}>
                    <EventsMap center={null} radiusKm={null} pins={[{ id: e.id, lat: e.lat, lng: e.lng, label: e.venue_name ?? e.title, title: e.title }]} selectedId={e.id} height={180} interactive={false} youLabel={t("place")} />
                  </div>
                )}
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={ROW_TITLE}>{e.is_online ? (platform ?? t("online")) : e.venue_name ?? e.city ?? "—"}</span>
                  {e.address && <span style={META}>{e.address}</span>}
                  {directions && <a href={directions} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, paddingTop: 6 }}>{t("directions")}</a>}
                  {joinUrl && <a href={joinUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, paddingTop: 6 }}>{joinLabel} ↗</a>}
                  {e.is_online && <span style={{ ...META, paddingTop: 4 }}>{t("joinHint")}</span>}
                </div>
              </div>

              <div style={{ ...EYEBROW_PAD }}><Eyebrow>{t("organiser")}</Eyebrow></div>
              <div style={{ ...CARD, padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={ROW_TITLE}>{e.organiser ?? "—"}</span>
                <span style={META}>
                  {e.submitted_name ? t("proposedBy", { name: e.submitted_name }) : null}
                  {e.published_at ? ` · ${t("verified")}` : null}
                </span>
                {e.ticket_url && !e.is_online && <a href={e.ticket_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, paddingTop: 6 }}>{t("tickets")}</a>}
                <span style={{ ...META, paddingTop: 6 }}>{t("registered", { count: e.going })}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: "16px", color: "var(--color-foreground-muted)" }}>{t("visibility")}</p>
            </>
          }
        />
        <Footer />
      </Well>
    </div>
  );
}

const EYEBROW_PAD = { paddingTop: 8 } as const;

function Banner({ children }: { children: React.ReactNode }) {
  return <div role="status" style={{ marginBottom: 24, padding: "12px 16px", borderRadius: 8, background: "var(--color-warning-subtle)", color: "var(--color-warning)", fontSize: 14, fontWeight: 500 }}>{children}</div>;
}
