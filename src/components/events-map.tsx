"use client";

import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";

/**
 * The map: MapLibre on MapTiler's "dataviz light" style (grey, quiet, the
 * Hub's ground). Pins are DOM markers so they take the Hub's tokens: a black
 * pill with the day of the month; the selected one orange. The person's own
 * city is the blue dot with the radius ring, as on the mock.
 *
 * No key: a flat placeholder, so the page still works locally.
 */
export type Pin = { id: string; lat: number; lng: number; label: string; title: string };

export function EventsMap({
  center,
  radiusKm,
  pins,
  selectedId,
  onSelect,
  height = 400,
  interactive = true,
  youLabel,
}: {
  center: { lat: number; lng: number } | null;
  radiusKm: number | null;
  pins: Pin[];
  selectedId: string | null;
  onSelect?: (id: string) => void;
  height?: number;
  interactive?: boolean;
  youLabel: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const you = useRef<maplibregl.Marker | null>(null);
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  // Create once.
  useEffect(() => {
    if (!el.current || map.current || !key) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: `https://api.maptiler.com/maps/dataviz-light/style.json?key=${key}`,
      center: center ? [center.lng, center.lat] : [2.35, 46.6],
      zoom: center ? 11 : 5,
      attributionControl: { compact: true },
      interactive,
      cooperativeGestures: interactive,
    });
    if (interactive) m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("load", () => {
      m.addSource("radius", { type: "geojson", data: circle(center, radiusKm) });
      m.addLayer({ id: "radius-fill", type: "fill", source: "radius", paint: { "fill-color": "#e9521e", "fill-opacity": 0.05 } });
      m.addLayer({ id: "radius-line", type: "line", source: "radius", paint: { "line-color": "#e9521e", "line-opacity": 0.45, "line-width": 1.5, "line-dasharray": [2, 2] } });
    });
    map.current = m;
    const mks = markers.current;
    return () => {
      m.remove();
      map.current = null;
      mks.clear();
      you.current = null;
    };
    // The map is created once; later changes go through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // The person's city and radius.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      const src = m.getSource("radius") as maplibregl.GeoJSONSource | undefined;
      src?.setData(circle(center, radiusKm));
      if (center) {
        if (!you.current) {
          const dot = document.createElement("div");
          dot.setAttribute("aria-label", youLabel);
          dot.setAttribute("role", "img");
          dot.style.cssText = "width:14px;height:14px;border-radius:50%;background:#2a5bd7;border:3px solid #fff;box-shadow:0 0 0 5px rgba(42,91,215,.2)";
          you.current = new maplibregl.Marker({ element: dot }).setLngLat([center.lng, center.lat]).addTo(m);
        } else you.current.setLngLat([center.lng, center.lat]);
      }
    };
    if (m.isStyleLoaded()) apply();
    else m.once("load", apply);
  }, [center, radiusKm, youLabel]);

  // Pins: add, update, remove.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    for (const p of pins) {
      seen.add(p.id);
      let mk = markers.current.get(p.id);
      if (!mk) {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", p.title);
        b.addEventListener("click", (ev) => {
          ev.stopPropagation();
          onSelect?.(p.id);
        });
        mk = new maplibregl.Marker({ element: b, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(m);
        markers.current.set(p.id, mk);
      } else mk.setLngLat([p.lng, p.lat]);
      const b = mk.getElement() as HTMLButtonElement;
      const sel = p.id === selectedId;
      b.textContent = p.label;
      b.style.cssText = `height:30px;padding:0 10px;border-radius:9999px;border:2px solid #fff;font:600 12px/1 var(--font-inter),system-ui,sans-serif;cursor:${onSelect ? "pointer" : "default"};white-space:nowrap;box-shadow:0 10px 24px -14px rgba(29,29,27,.28);background:${sel ? "#e9521e" : "#1d1d1b"};color:#fff;z-index:${sel ? 3 : 2};position:relative`;
    }
    for (const [id, mk] of markers.current) {
      if (!seen.has(id)) {
        mk.remove();
        markers.current.delete(id);
      }
    }
  }, [pins, selectedId, onSelect]);

  // Fit the view to the pins and the person, once per set of pins.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const pts: [number, number][] = pins.map((p) => [p.lng, p.lat]);
    if (center) pts.push([center.lng, center.lat]);
    if (pts.length < 2) {
      if (pts[0]) m.easeTo({ center: pts[0], zoom: 11, duration: 400 });
      return;
    }
    const b = pts.reduce((acc, p) => acc.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0]));
    m.fitBounds(b, { padding: 48, maxZoom: 13, duration: 500 });
    // Only when the set of pins changes, not on every selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins.map((p) => p.id).join(","), center?.lat, center?.lng]);

  if (!key) {
    return (
      <div role="img" aria-label="Map" style={{ height, borderRadius: 12, background: "var(--color-neutral-100)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--color-foreground-muted)", textAlign: "center", padding: 16 }}>
        NEXT_PUBLIC_MAPTILER_KEY is not set — the map renders once it is.
      </div>
    );
  }
  return <div ref={el} style={{ height, borderRadius: 12, overflow: "hidden", border: "1px solid var(--color-border)" }} />;
}

/** A GeoJSON circle of `km` around a point (64 segments), or nothing. */
function circle(center: { lat: number; lng: number } | null, km: number | null): GeoJSON.FeatureCollection {
  if (!center || !km) return { type: "FeatureCollection", features: [] };
  const coords: [number, number][] = [];
  const dLat = km / 110.574;
  const dLng = km / (111.32 * Math.cos((center.lat * Math.PI) / 180));
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    coords.push([center.lng + dLng * Math.cos(a), center.lat + dLat * Math.sin(a)]);
  }
  return { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } }] };
}
