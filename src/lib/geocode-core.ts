/**
 * MapTiler geocoding, the part both sides share: the URL and the reading of
 * the answer. Pure, so it is unit-tested and runs in the browser too.
 *
 * Why the browser (4 Nov 2026): the MapTiler key may be limited to the sites
 * that use it, in which case a call from the server (no Origin) is refused
 * while the same key works for the map tiles in the page. Calling from the
 * page, like the tiles do, works either way; the server call stays as a
 * fallback.
 */
export type GeoHit = { label: string; city: string | null; lat: number; lng: number };
export type GeoKind = "address" | "city";

export function geocodeUrl(query: string, key: string, kind: GeoKind, opts: { autocomplete?: boolean; limit?: number } = {}): string {
  const types = kind === "city" ? "municipality,locality,place" : "address,poi,street,municipality";
  const params = new URLSearchParams({ key, limit: String(opts.limit ?? 1), language: "fr", country: "fr,be,ch,lu", types });
  if (opts.autocomplete) params.set("autocomplete", "true");
  return `https://api.maptiler.com/geocoding/${encodeURIComponent(query.trim())}.json?${params.toString()}`;
}

type Feature = { place_name?: string; center?: [number, number]; context?: Array<{ id?: string; text?: string }>; place_type?: string[]; text?: string };

export function parseHits(json: unknown, query: string): GeoHit[] {
  const features = (json as { features?: Feature[] } | null)?.features ?? [];
  return features
    .filter((f): f is Feature & { center: [number, number] } => Array.isArray(f.center) && f.center.length === 2)
    .map((f) => {
      const [lng, lat] = f.center;
      const municipality = f.context?.find((c) => c.id?.startsWith("municipality") || c.id?.startsWith("place"))?.text;
      const isCity = f.place_type?.some((t) => t === "municipality" || t === "place" || t === "locality");
      const city = isCity ? (f.text ?? null) : (municipality ?? null);
      return { label: f.place_name ?? query, city, lat, lng };
    });
}

/** From the browser, with the public map key. Empty on any failure. */
export async function geocodeInBrowser(query: string, kind: GeoKind, opts: { autocomplete?: boolean; limit?: number } = {}): Promise<GeoHit[]> {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (!key || query.trim().length < 2) return [];
  try {
    const res = await fetch(geocodeUrl(query, key, kind, opts));
    if (!res.ok) return [];
    return parseHits(await res.json(), query);
  } catch {
    return [];
  }
}
