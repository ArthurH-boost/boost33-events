import "server-only";
import { setting } from "./env";

/**
 * Address and city → coordinates, through MapTiler's geocoding API (the same
 * key as the map tiles; free tier covers our volumes). Server-side only, so the
 * key never has to be a browser key for geocoding. Results are biased to
 * France, where the network is, and limited to one.
 */
export type GeoHit = { label: string; city: string | null; lat: number; lng: number };

export async function geocode(query: string, kind: "address" | "city" = "address"): Promise<GeoHit | null> {
  const key = setting("MAPTILER_KEY");
  const q = query.trim();
  if (!key || q.length < 2) return null;

  const types = kind === "city" ? "municipality,locality,place" : "address,poi,street,municipality";
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${encodeURIComponent(key)}&limit=1&language=fr&country=fr,be,ch,lu&types=${types}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const json = (await res.json()) as { features?: Array<{ place_name?: string; center?: [number, number]; context?: Array<{ id?: string; text?: string }>; place_type?: string[]; text?: string }> };
  const f = json.features?.[0];
  if (!f?.center) return null;
  const [lng, lat] = f.center;
  const municipality = f.context?.find((c) => c.id?.startsWith("municipality") || c.id?.startsWith("place"))?.text;
  const city = f.place_type?.some((t) => t === "municipality" || t === "place") ? (f.text ?? null) : (municipality ?? null);
  return { label: f.place_name ?? q, city, lat, lng };
}
