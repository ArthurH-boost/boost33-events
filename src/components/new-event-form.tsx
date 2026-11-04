"use client";

import Link from "next/link";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { geocodeAction, prefillAction, submitEventAction } from "@/app/actions";
import { EVENT_KINDS, RADIUS_OPTIONS_KM, type EventKind, type Locale } from "@/lib/config";
import type { MemberLocation } from "@/lib/events";
import { dayMonth, fromLocalInput, km, toLocalInput, when } from "@/lib/format";
import type { Prefill } from "@/lib/import-link";
import { ONLINE_PLATFORMS, PLATFORM_NAMES, platformFromUrl, type OnlinePlatform } from "@/lib/online";
import { BTN_PRIMARY, BTN_SECONDARY, CARD, DateSquare, Eyebrow, HELP, INPUT, LABEL, META, ROW_TITLE, Row, Tag } from "./ui";

type Form = {
  source_url: string;
  title: string;
  kind: EventKind;
  price: "free" | "paid" | "invite";
  starts_at: string; // datetime-local
  ends_at: string;
  is_online: boolean;
  online_platform: OnlinePlatform | "";
  online_url: string;
  venue_name: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  description: string;
  organiser: string;
  ticket_url: string;
  image_url: string;
  push_radius_km: number;
  brokers_only: boolean;
};

const EMPTY: Form = { source_url: "", title: "", kind: "networking", price: "free", starts_at: "", ends_at: "", is_online: false, online_platform: "", online_url: "", venue_name: "", address: "", city: "", lat: null, lng: null, description: "", organiser: "", ticket_url: "", image_url: "", push_radius_km: 25, brokers_only: false };

/** The whole form lives in one state object so the two previews in the rail follow every keystroke. */
export function NewEventForm({ locale, isAdmin, memberLocation }: { locale: Locale; isAdmin: boolean; memberLocation: MemberLocation | null }) {
  const t = useTranslations("new");
  const tk = useTranslations("kinds");
  const tp = useTranslations("price");
  const [f, setF] = useState<Form>(EMPTY);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [geo, setGeo] = useState<"idle" | "busy" | "ok" | "fail">("idle");
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ id: string; queued: number | null } | null>(null);

  const prefill = () =>
    start(async () => {
      setNotice(null);
      const r = await prefillAction(f.source_url);
      if (!r.ok) return setNotice({ tone: "error", text: t("prefillFailed") });
      const p: Prefill = r.data;
      setF((s) => ({
        ...s,
        title: p.title ?? s.title,
        description: p.description ?? s.description,
        starts_at: p.starts_at ? toLocalInput(p.starts_at) : s.starts_at,
        ends_at: p.ends_at ? toLocalInput(p.ends_at) : s.ends_at,
        is_online: p.is_online ?? s.is_online,
        kind: p.is_online ? "online" : s.kind,
        venue_name: p.venue_name ?? s.venue_name,
        address: p.address ?? s.address,
        city: p.city ?? s.city,
        lat: p.lat ?? s.lat,
        lng: p.lng ?? s.lng,
        organiser: p.organiser ?? s.organiser,
        image_url: p.image_url ?? s.image_url,
        ticket_url: p.ticket_url ?? s.ticket_url,
        // An imported online event: the page's own link is usually where it streams.
        online_url: p.is_online && !s.online_url ? (p.ticket_url ?? s.source_url) : s.online_url,
        online_platform: p.is_online && !s.online_platform ? (platformFromUrl(p.ticket_url ?? s.source_url) ?? "") : s.online_platform,
        price: p.price ?? s.price,
      }));
      if (p.lat != null) setGeo("ok");
      setNotice({ tone: "ok", text: t("prefillOk") });
    });

  const locate = () =>
    start(async () => {
      setGeo("busy");
      const r = await geocodeAction([f.address, f.city].filter(Boolean).join(", "));
      if (!r.ok) return setGeo("fail");
      setF((s) => ({ ...s, lat: r.data.lat, lng: r.data.lng, city: s.city || r.data.city || "" }));
      setGeo("ok");
    });

  const submit = (fd: FormData) =>
    start(async () => {
      setNotice(null);
      const r = await submitEventAction(fd);
      if (!r.ok) {
        const key = r.error === "title" || r.error === "date" || r.error === "place" || r.error === "link" ? r.error : "generic";
        return setNotice({ tone: "error", text: t(`errors.${key}`) });
      }
      setDone(r.data);
    });

  if (done) {
    return (
      <div style={{ ...CARD, padding: 28, maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ margin: 0, fontSize: 16 }}>{isAdmin && done.queued != null ? t("doneAdmin", { queued: done.queued }) : t("done")}</p>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href={`/events/${done.id}`} style={BTN_PRIMARY}>{t("previewList")}</Link>
          <Link href="/" style={BTN_SECONDARY}>Events</Link>
        </div>
      </div>
    );
  }

  const startIso = fromLocalInput(f.starts_at);
  const d = startIso ? dayMonth(startIso, locale) : { day: "–", month: "" };
  const distance = memberLocation && f.lat != null && f.lng != null ? km(haversine(memberLocation.lat, memberLocation.lng, f.lat, f.lng), locale) : null;

  return (
    <Row
      main={
        <form action={submit} style={{ display: "flex", flexDirection: "column", gap: 44 }}>
          <div>
            <Eyebrow>{t("quickImport")}</Eyebrow>
            <div style={{ ...CARD, padding: 28, display: "flex", flexDirection: "column", gap: 10 }}>
              <label htmlFor="source_url" style={LABEL}>{t("link")}</label>
              <div className="flex flex-wrap gap-3">
                <input id="source_url" name="source_url" type="url" value={f.source_url} onChange={(e) => set("source_url", e.target.value)} placeholder={t("linkPlaceholder")} style={{ ...INPUT, flex: "1 1 320px", width: "auto" }} />
                <button type="button" onClick={prefill} disabled={pending || !f.source_url} style={{ ...BTN_PRIMARY, opacity: pending || !f.source_url ? 0.55 : 1 }}>{t("prefill")}</button>
              </div>
              <span style={HELP}>{t("prefillHelp")}</span>
              {notice && <p role="alert" style={{ margin: 0, fontSize: 13, color: notice.tone === "ok" ? "var(--color-success)" : "var(--color-danger)" }}>{notice.text}</p>}
            </div>
          </div>

          <div>
            <Eyebrow>{t("form")}</Eyebrow>
            <div style={{ ...CARD, padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
              <Field id="title" label={t("eventTitle")}>
                <input id="title" name="title" type="text" required minLength={3} maxLength={160} value={f.title} onChange={(e) => set("title", e.target.value)} style={INPUT} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="kind" label={t("kind")}>
                  <select id="kind" name="kind" value={f.kind} onChange={(e) => { const k = e.target.value as EventKind; setF((s) => ({ ...s, kind: k, is_online: k === "online" ? true : s.is_online })); }} style={INPUT}>
                    {EVENT_KINDS.map((k) => <option key={k} value={k}>{tk(k)}</option>)}
                  </select>
                </Field>
                <Field id="price" label={t("price")}>
                  <select id="price" name="price" value={f.price} onChange={(e) => set("price", e.target.value as Form["price"])} style={INPUT}>
                    <option value="free">{tp("free")}</option>
                    <option value="paid">{tp("paid")}</option>
                    <option value="invite">{tp("invite")}</option>
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="starts_at" label={t("start")}>
                  <input id="starts_at" name="starts_at" type="datetime-local" required value={f.starts_at} onChange={(e) => set("starts_at", e.target.value)} style={INPUT} />
                </Field>
                <Field id="ends_at" label={t("end")}>
                  <input id="ends_at" name="ends_at" type="datetime-local" value={f.ends_at} onChange={(e) => set("ends_at", e.target.value)} style={INPUT} />
                </Field>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, minHeight: 32, cursor: "pointer" }}>
                <input type="checkbox" name="is_online" checked={f.is_online} onChange={(e) => set("is_online", e.target.checked)} style={{ width: 18, height: 18, accentColor: "#e9521e", margin: 0 }} />
                {t("online")}
              </label>

              {f.is_online && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="online_url" label={t("onlineUrl")} help={t("onlineUrlHelp")}>
                    <input
                      id="online_url"
                      name="online_url"
                      type="url"
                      required
                      value={f.online_url}
                      onChange={(e) => {
                        const url = e.target.value;
                        const guessed = platformFromUrl(url);
                        setF((s) => ({ ...s, online_url: url, online_platform: guessed ?? s.online_platform }));
                      }}
                      placeholder="https://www.twitch.tv/…"
                      style={INPUT}
                    />
                  </Field>
                  <Field id="online_platform" label={t("platform")}>
                    <select id="online_platform" name="online_platform" value={f.online_platform} onChange={(e) => set("online_platform", e.target.value as OnlinePlatform)} style={INPUT}>
                      <option value="">{t("platformPick")}</option>
                      {ONLINE_PLATFORMS.map((p) => <option key={p} value={p}>{p === "other" ? t("platformOther") : PLATFORM_NAMES[p]}</option>)}
                    </select>
                  </Field>
                </div>
              )}

              {!f.is_online && (
                <>
                  <Field id="venue_name" label={t("venue")}>
                    <input id="venue_name" name="venue_name" type="text" value={f.venue_name} onChange={(e) => set("venue_name", e.target.value)} style={INPUT} />
                  </Field>
                  <Field id="address" label={t("address")} help={geo === "fail" ? t("addressNotFound") : t("addressHelp")} tone={geo === "fail" ? "error" : undefined}>
                    <div className="flex flex-wrap gap-3">
                      <input id="address" name="address" type="text" value={f.address} onChange={(e) => { set("address", e.target.value); setGeo("idle"); }} placeholder={t("addressPlaceholder")} style={{ ...INPUT, flex: "1 1 280px", width: "auto" }} />
                      <button type="button" onClick={locate} disabled={pending || !f.address} style={{ ...BTN_SECONDARY, opacity: pending || !f.address ? 0.55 : 1 }}>
                        {geo === "ok" ? `✓ ${t("located")}` : t("locate")}
                      </button>
                    </div>
                  </Field>
                  <input type="hidden" name="city" value={f.city} />
                  <input type="hidden" name="lat" value={f.lat ?? ""} />
                  <input type="hidden" name="lng" value={f.lng ?? ""} />
                </>
              )}

              <Field id="description" label={t("description")}>
                <textarea id="description" name="description" rows={5} maxLength={4000} value={f.description} onChange={(e) => set("description", e.target.value)} style={{ ...INPUT, height: "auto", padding: "10px 12px", resize: "vertical" }} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="organiser" label={t("organiser")}>
                  <input id="organiser" name="organiser" type="text" value={f.organiser} onChange={(e) => set("organiser", e.target.value)} style={INPUT} />
                </Field>
                <Field id="ticket_url" label={t("ticketUrl")}>
                  <input id="ticket_url" name="ticket_url" type="url" value={f.ticket_url} onChange={(e) => set("ticket_url", e.target.value)} style={INPUT} />
                </Field>
              </div>
              <Field id="image_url" label={t("imageUrl")}>
                <input id="image_url" name="image_url" type="url" value={f.image_url} onChange={(e) => set("image_url", e.target.value)} style={INPUT} />
              </Field>
            </div>
          </div>

          <div>
            <Eyebrow>{t("broadcast")}</Eyebrow>
            <div style={{ ...CARD, padding: "8px 28px", display: "flex", flexDirection: "column" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, minHeight: 44 }}>
                <span>{t("pushRadius")}</span>
                <select name="push_radius_km" value={f.push_radius_km} onChange={(e) => set("push_radius_km", Number(e.target.value))} style={{ ...INPUT, width: 120, height: 32 }}>
                  {RADIUS_OPTIONS_KM.map((r) => <option key={r} value={r}>{r} km</option>)}
                </select>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, minHeight: 44, borderTop: "1px solid var(--color-border)", cursor: "pointer" }}>
                <input type="checkbox" name="brokers_only" checked={f.brokers_only} onChange={(e) => set("brokers_only", e.target.checked)} style={{ width: 18, height: 18, accentColor: "#e9521e", margin: 0 }} />
                {t("brokersOnly")}
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button type="submit" disabled={pending} style={{ ...BTN_PRIMARY, opacity: pending ? 0.55 : 1 }}>{pending ? t("submitting") : t("submit")}</button>
            <span style={HELP}>{t("reviewTime")}</span>
          </div>
        </form>
      }
      rail={
        <>
          <Eyebrow>{t("previewList")}</Eyebrow>
          <div style={{ ...CARD, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <DateSquare day={d.day} month={d.month} />
            <span style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={ROW_TITLE}>{f.title || "—"}</span>
              <span style={META}>{startIso ? when(startIso, fromLocalInput(f.ends_at), locale) : "—"}{f.is_online ? ` · ${f.online_platform && f.online_platform !== "other" ? PLATFORM_NAMES[f.online_platform] : tk("online")}` : f.venue_name ? ` · ${f.venue_name}` : ""}</span>
            </span>
            <Tag>{tk(f.kind)}</Tag>
          </div>

          <div style={{ paddingTop: 8 }}><Eyebrow>{t("previewNotif")}</Eyebrow></div>
          <div style={{ background: "var(--color-neutral-950)", color: "#FFFFFF", borderRadius: 8, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: 6, background: "var(--color-primary)", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>Boost33 Events</span>
              <span style={{ fontSize: 13, fontWeight: 600, lineHeight: "18px" }}>{t("notifTitle", { distance: distance ?? "—" })}</span>
              <span style={{ fontSize: 13, lineHeight: "18px", opacity: 0.9 }}>{t("notifBody", { title: f.title || "—", when: startIso ? when(startIso, null, locale) : "—" })}</span>
            </div>
          </div>

          <div style={{ paddingTop: 8 }}><Eyebrow>{t("reach")}</Eyebrow></div>
          <div style={{ ...CARD, padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, lineHeight: "18px" }}>{t("reachBody")}</span>
            <span style={META}>{t("reviewTime")}</span>
          </div>
        </>
      }
    />
  );
}

function Field({ id, label, help, tone, children }: { id: string; label: string; help?: string; tone?: "error"; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={LABEL}>{label}</label>
      {children}
      {help && <span style={{ ...HELP, color: tone === "error" ? "var(--color-danger)" : HELP.color }}>{help}</span>}
    </div>
  );
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = (x: number) => (x * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
