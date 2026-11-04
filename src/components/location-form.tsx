"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { setLocationAction } from "@/app/actions";
import { RADIUS_OPTIONS_KM } from "@/lib/config";
import type { MemberLocation } from "@/lib/events";
import { geocodeInBrowser } from "@/lib/geocode-core";
import { BTN_PRIMARY, BTN_SECONDARY, CARD, HELP, INPUT, LABEL } from "./ui";

/** "Where are you?" — asked once, editable from the subtitle's "Change". */
export function LocationForm({ current }: { current: MemberLocation | null }) {
  const t = useTranslations("location");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setError(null);
          const hit = (await geocodeInBrowser(String(fd.get("city") ?? ""), "city"))[0];
          if (hit) {
            fd.set("lat", String(hit.lat));
            fd.set("lng", String(hit.lng));
            fd.set("found_city", hit.city ?? hit.label);
          }
          const r = await setLocationAction(fd);
          if (!r.ok) setError(t("notFound"));
          else router.push("/");
        })
      }
      style={{ ...CARD, padding: 24, marginBottom: 40, display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h2 style={{ fontSize: 20 }}>{t("title")}</h2>
        <p style={{ ...HELP, margin: 0 }}>{t("help")}</p>
      </div>
      <div className="flex flex-wrap gap-4">
        <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="city" style={LABEL}>{t("city")}</label>
          <input id="city" name="city" type="text" required autoFocus defaultValue={current?.city ?? ""} placeholder={t("cityPlaceholder")} style={INPUT} />
        </div>
        <div style={{ flex: "0 1 140px", display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="radius_km" style={LABEL}>{t("radius")}</label>
          <select id="radius_km" name="radius_km" defaultValue={current?.radius_km ?? 25} style={INPUT}>
            {RADIUS_OPTIONS_KM.map((r) => (
              <option key={r} value={r}>{t("km", { km: r })}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--color-danger)" }}>{error}</p>}
      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" disabled={pending} style={{ ...BTN_PRIMARY, opacity: pending ? 0.55 : 1 }}>{pending ? t("searching") : t("save")}</button>
        {current && <Link href="/" style={BTN_SECONDARY}>{t("cancel")}</Link>}
      </div>
    </form>
  );
}
