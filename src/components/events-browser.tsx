"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import type { EventKind, Locale } from "@/lib/config";
import type { EventRow, Near } from "@/lib/events";
import { dayMonth, km, when } from "@/lib/format";
import { EventsMap, type Pin } from "./events-map";
import { BigNumber, BTN_PRIMARY, CARD, Chevron, DateSquare, EYEBROW, KIND_ORDER, MAIN_CARD, META, NetworkDots, ROW_TITLE, Row, Tag } from "./ui";

/**
 * The home: filters, the main card (two figures + one row per event) and the
 * rail with the map and the selected event. Selecting a row or a pin
 * highlights both; opening goes to the fiche.
 */
export function EventsBrowser({ near, kind, locale }: { near: Near; kind: EventKind | null; locale: Locale }) {
  const t = useTranslations("home");
  const tk = useTranslations("kinds");
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(near.events[0]?.id ?? null);
  const onSelect = useCallback((id: string) => setSelected(id), []);

  const pins = useMemo<Pin[]>(
    () => near.events.filter((e): e is EventRow & { lat: number; lng: number } => !e.is_online && e.lat != null && e.lng != null).map((e) => ({ id: e.id, lat: e.lat, lng: e.lng, label: dayMonth(e.starts_at, locale).day, title: e.title })),
    [near.events, locale],
  );
  const current = near.events.find((e) => e.id === selected) ?? near.events[0] ?? null;
  const networkTotal = near.events.reduce((n, e) => n + e.network_going, 0);
  const top = near.events.reduce<EventRow | null>((best, e) => (e.network_going > (best?.network_going ?? 0) ? e : best), null);

  const filters: Array<{ key: EventKind | null; label: string }> = [{ key: null, label: tk("all") }, ...KIND_ORDER.map((k) => ({ key: k, label: tk(k) }))];

  return (
    <Row
      main={
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingBottom: 16 }}>
            <div style={EYEBROW}>{t("thisMonth")}</div>
            <div style={{ fontSize: 13, color: "var(--color-foreground-muted)" }}>{t("count", { count: near.events.length })}</div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 16 }}>
            {filters.map((f) => {
              const active = f.key === kind;
              return (
                <Link
                  key={f.key ?? "all"}
                  href={f.key ? `/?kind=${f.key}` : "/"}
                  aria-current={active ? "true" : undefined}
                  style={{ display: "inline-flex", alignItems: "center", height: 32, padding: "0 12px", borderRadius: 9999, fontSize: 13, fontWeight: 600, textDecoration: "none", border: `1px solid ${active ? "var(--color-neutral-950)" : "var(--color-border-strong)"}`, background: active ? "var(--color-neutral-950)" : "var(--color-surface)", color: active ? "#FFFFFF" : "var(--color-foreground)" }}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>

          <div style={MAIN_CARD}>
            <div className="flex flex-wrap" style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: "clip" }}>
              <div style={{ flex: "1 1 240px", padding: 28, borderRight: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-foreground-muted)" }}>{t("newThisWeek")}</span>
                <BigNumber value={near.new_this_week} label={t("nearYou")} />
              </div>
              <div style={{ flex: "1 1 240px", padding: 28, borderBottom: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-foreground-muted)" }}>{t("networkGoing")}</span>
                <BigNumber value={networkTotal} label={t("membersGoing")} note={top && top.network_going > 0 ? `${top.network_going} · ${top.title}` : undefined} />
              </div>
            </div>

            {near.events.length === 0 ? (
              <p style={{ margin: 0, padding: 28, fontSize: 14, lineHeight: "20px", color: "var(--color-foreground-muted)" }}>
                {kind ? t("emptyKind", { kind: tk(kind) }) : t("empty")}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {near.events.map((e, i) => {
                  const d = dayMonth(e.starts_at, locale);
                  const sel = e.id === (current?.id ?? null);
                  const last = i === near.events.length - 1;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelected(e.id)}
                      onDoubleClick={() => router.push(`/events/${e.id}`)}
                      aria-pressed={sel}
                      style={{ font: "inherit", textAlign: "left", width: "100%", margin: 0, border: "none", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, padding: "18px 28px", borderTop: i === 0 ? undefined : "1px solid var(--color-border)", background: sel ? "var(--color-neutral-50)" : "var(--color-surface)", borderBottomLeftRadius: last ? 12 : 0, borderBottomRightRadius: last ? 12 : 0 }}
                    >
                      <DateSquare day={d.day} month={d.month} tone={sel ? "primary" : "muted"} />
                      <span style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={ROW_TITLE}>{e.title}</span>
                        <span style={META}>
                          {when(e.starts_at, e.ends_at, locale)} · {e.is_online ? t("online") : [e.venue_name ?? e.city, km(e.distance_km, locale)].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {e.network_going > 0 && (
                        <span className="hidden md:flex" style={{ alignItems: "center", gap: 6, flexShrink: 0, fontSize: 12, color: "var(--color-foreground-secondary)" }}>
                          <NetworkDots />
                          {t("fromNetwork", { count: e.network_going })}
                        </span>
                      )}
                      <span className="hidden sm:inline-flex"><Tag>{tk(e.kind)}</Tag></span>
                      <Chevron />
                    </button>
                  );
                })}
              </div>
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
        </div>
      }
      rail={
        <>
          <div style={EYEBROW}>{t("map")}</div>
          <EventsMap center={near.location ? { lat: near.location.lat, lng: near.location.lng } : null} radiusKm={near.location?.radius_km ?? null} pins={pins} selectedId={current?.id ?? null} onSelect={onSelect} height={400} youLabel={t("you")} />
          {current && (
            <div style={{ ...CARD, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-foreground-muted)" }}>
                {t("selected")}{current.distance_km != null ? ` · ${km(current.distance_km, locale)}` : current.is_online ? ` · ${t("online")}` : ""}
              </span>
              <span style={ROW_TITLE}>{current.title}</span>
              <span style={META}>{when(current.starts_at, current.ends_at, locale)}{current.venue_name ? ` · ${current.venue_name}` : ""}</span>
              <Link href={`/events/${current.id}`} style={{ ...BTN_PRIMARY, marginTop: 4 }}>{t("open")}</Link>
            </div>
          )}
          <p style={{ margin: 0, fontSize: 12, lineHeight: "16px", color: "var(--color-foreground-muted)" }}>{t("footnote")}</p>
        </>
      }
    />
  );
}
