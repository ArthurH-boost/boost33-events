import "server-only";
import { setting } from "./env";
import { geocodeUrl, parseHits, type GeoHit, type GeoKind } from "./geocode-core";

export type { GeoHit } from "./geocode-core";

/**
 * Address and city → coordinates from the server, through MapTiler. Kept as a
 * fallback: the page geocodes in the browser first (see geocode-core.ts for
 * why). Results are biased to France, where the network is.
 */
export async function geocode(query: string, kind: GeoKind = "address"): Promise<GeoHit | null> {
  return (await call(query, kind, { limit: 1 }))[0] ?? null;
}

/** Up to five cities matching what is being typed (fallback for the search field). */
export async function suggestCities(query: string): Promise<GeoHit[]> {
  return call(query, "city", { autocomplete: true, limit: 5 });
}

async function call(query: string, kind: GeoKind, opts: { autocomplete?: boolean; limit?: number }): Promise<GeoHit[]> {
  const key = setting("MAPTILER_KEY");
  if (!key || query.trim().length < 2) return [];
  try {
    const res = await fetch(geocodeUrl(query, key, kind, opts), { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      console.warn(`[geocode] MapTiler answered ${res.status} for a ${kind} lookup`);
      return [];
    }
    return parseHits(await res.json(), query);
  } catch (e) {
    console.warn("[geocode] MapTiler unreachable", e);
    return [];
  }
}
