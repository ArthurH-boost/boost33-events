"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { suggestCitiesAction } from "@/app/actions";
import type { EventKind } from "@/lib/config";
import { geocodeInBrowser, type GeoHit } from "@/lib/geocode-core";
import { INPUT } from "./ui";

/**
 * "Search a city" (4 Nov 2026): look at the events around another city without
 * changing the saved one. Suggestions as you type; picking one (or Enter)
 * reloads the page with ?city=…, which the server reads. Nothing is stored.
 */
export function CitySearch({ kind, current }: { kind: EventKind | null; current: string | null }) {
  const t = useTranslations("search");
  const router = useRouter();
  const [q, setQ] = useState(current ?? "");
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const seq = useRef(0);

  useEffect(() => {
    const query = q.trim();
    const n = ++seq.current; // any answer still in flight is now stale
    if (query.length < 2 || query === current) return;
    const timer = setTimeout(async () => {
      // From the page first (like the map tiles), the server as a fallback.
      let r = await geocodeInBrowser(query, "city", { autocomplete: true, limit: 5 });
      if (r.length === 0) r = await suggestCitiesAction(query);
      if (n === seq.current) {
        setHits(r);
        setActive(-1);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q, current]);

  // Suggestions only while there is something new to look up.
  const shown = q.trim().length >= 2 && q.trim() !== current ? hits : [];

  const submit = async () => {
    const picked = active >= 0 ? (shown[active] ?? null) : null;
    if (picked) return go(picked);
    // Enter without picking: the first suggestion, or one lookup now; the server tries last (?city= alone).
    const first = shown[0] ?? (await geocodeInBrowser(q, "city", { limit: 1 }))[0] ?? null;
    go(first);
  };

  const go = (hit: GeoHit | null) => {
    const params = new URLSearchParams();
    if (kind) params.set("kind", kind);
    if (hit) {
      params.set("city", hit.city ?? hit.label);
      params.set("lat", hit.lat.toFixed(5));
      params.set("lng", hit.lng.toFixed(5));
    } else if (q.trim()) {
      params.set("city", q.trim());
    }
    setOpen(false);
    router.push(`/${params.size ? `?${params.toString()}` : ""}`);
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      style={{ position: "relative", width: "100%", maxWidth: 360 }}
    >
      <label htmlFor="city-search" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{t("label")}</label>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: 12, top: 12, color: "var(--color-foreground-muted)" }}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
      <input
        id="city-search"
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={open && shown.length > 0}
        aria-controls="city-search-list"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, shown.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={t("placeholder")}
        style={{ ...INPUT, paddingLeft: 36 }}
      />
      {open && shown.length > 0 && (
        <ul id="city-search-list" role="listbox" style={{ position: "absolute", zIndex: 20, top: 44, left: 0, right: 0, margin: 0, padding: 4, listStyle: "none", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, boxShadow: "0 10px 24px -14px rgba(29,29,27,.28)" }}>
          {shown.map((h, i) => (
            <li key={`${h.lat},${h.lng}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(h)}
                style={{ font: "inherit", width: "100%", textAlign: "left", border: "none", borderRadius: 6, padding: "8px 10px", cursor: "pointer", background: i === active ? "var(--color-neutral-50)" : "transparent", color: "var(--color-foreground)", display: "flex", flexDirection: "column", gap: 1 }}
              >
                <span style={{ fontSize: 14, fontWeight: 600 }}>{h.city ?? h.label}</span>
                <span style={{ fontSize: 12, color: "var(--color-foreground-muted)" }}>{h.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
