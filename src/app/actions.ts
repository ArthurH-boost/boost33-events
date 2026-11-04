"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EVENT_KINDS, RADIUS_OPTIONS_KM, type EventKind } from "@/lib/config";
import { currentSession } from "@/lib/current";
import { adminReview, eventSubmit, locationSet, rsvpSet, type NewEvent } from "@/lib/events";
import { prefillFromUrl } from "@/lib/fetch-page";
import { fromLocalInput } from "@/lib/format";
import { geocode, suggestCities, type GeoHit } from "@/lib/geocode";
import { isPlatform, platformFromUrl, safeUrl } from "@/lib/online";
import type { Prefill } from "@/lib/import-link";

/*
 * Every write of the app. Each one reads the session itself (the proxy put it
 * in the headers), so a form can never act for somebody else.
 */

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/** Find a city, save it with the radius. The page re-renders with events around it. */
export async function setLocationAction(formData: FormData): Promise<ActionResult<{ city: string }>> {
  const { claims } = await currentSession();
  const city = String(formData.get("city") ?? "").trim();
  const radius = Number(formData.get("radius_km") ?? 25);
  const radiusKm = (RADIUS_OPTIONS_KM as readonly number[]).includes(radius) ? radius : 25;
  if (city.length < 2) return { ok: false, error: "not_found" };
  const hit = await geocode(city, "city");
  if (!hit) return { ok: false, error: "not_found" };
  await locationSet(claims.sub, hit.city ?? hit.label, hit.lat, hit.lng, radiusKm);
  revalidatePath("/");
  return { ok: true, data: { city: hit.city ?? hit.label } };
}

export async function rsvpAction(eventId: string, going: boolean): Promise<ActionResult<{ going: number; me_going: boolean }>> {
  const { claims } = await currentSession();
  if (!/^[0-9a-f-]{36}$|^f\d$/.test(eventId)) return { ok: false, error: "bad_id" };
  try {
    const r = await rsvpSet(claims.sub, eventId, going);
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/");
    return { ok: true, data: r };
  } catch {
    return { ok: false, error: "generic" };
  }
}

/** Read an event page and return what it says. The person reviews the result. */
export async function prefillAction(url: string): Promise<ActionResult<Prefill>> {
  await currentSession();
  const p = await prefillFromUrl(url);
  return p ? { ok: true, data: p } : { ok: false, error: "unreadable" };
}

/** Address → coordinates, for the form's "find on the map" button. */
export async function geocodeAction(address: string): Promise<ActionResult<GeoHit>> {
  await currentSession();
  const hit = await geocode(address, "address");
  return hit ? { ok: true, data: hit } : { ok: false, error: "not_found" };
}

/** Cities matching what is typed in the "search a city" field. Read-only: nothing is saved. */
export async function suggestCitiesAction(query: string): Promise<GeoHit[]> {
  await currentSession();
  return suggestCities(String(query ?? "").slice(0, 80));
}

/** Submit a new event. Admins' events are published straight away. */
export async function submitEventAction(formData: FormData): Promise<ActionResult<{ id: string; queued: number | null }>> {
  const { claims, isAdmin } = await currentSession();
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string) => { const v = Number(formData.get(k)); return Number.isFinite(v) ? v : undefined; };

  const title = str("title");
  if (title.length < 3) return { ok: false, error: "title" };
  const starts_at = fromLocalInput(str("starts_at"));
  if (!starts_at) return { ok: false, error: "date" };
  const ends_at = fromLocalInput(str("ends_at")) ?? undefined;
  const kindRaw = str("kind");
  const kind: EventKind = (EVENT_KINDS as readonly string[]).includes(kindRaw) ? (kindRaw as EventKind) : "networking";
  const is_online = formData.get("is_online") === "on" || kind === "online";
  const lat = num("lat"), lng = num("lng");
  if (!is_online && (lat === undefined || lng === undefined)) return { ok: false, error: "place" };
  const priceRaw = str("price");
  const price = priceRaw === "paid" || priceRaw === "invite" ? priceRaw : "free";
  const radius = num("push_radius_km") ?? 25;
  // Online: the direct link to the live (platform URL only, never rewritten) and its platform.
  const onlineUrl = is_online ? safeUrl(str("online_url")) : null;
  if (is_online && !onlineUrl) return { ok: false, error: "link" };
  const platformRaw = str("online_platform");
  const online_platform = is_online ? (isPlatform(platformRaw) ? platformRaw : platformFromUrl(onlineUrl) ?? (onlineUrl ? "other" : undefined)) : undefined;

  const event: NewEvent = {
    kind: is_online && kind !== "online" ? kind : kind,
    title,
    description: str("description") || undefined,
    source_url: str("source_url") || undefined,
    ticket_url: str("ticket_url") || undefined,
    image_url: str("image_url") || undefined,
    organiser: str("organiser") || undefined,
    price,
    starts_at,
    ends_at,
    is_online,
    online_platform: online_platform ?? undefined,
    online_url: onlineUrl ?? undefined,
    venue_name: is_online ? undefined : str("venue_name") || undefined,
    address: is_online ? undefined : str("address") || undefined,
    city: is_online ? undefined : str("city") || undefined,
    lat: is_online ? undefined : lat,
    lng: is_online ? undefined : lng,
    push_radius_km: Math.min(500, Math.max(5, Math.round(radius))),
    brokers_only: formData.get("brokers_only") === "on",
  };
  try {
    const id = await eventSubmit(claims.sub, claims.name ?? null, claims.email ?? null, event);
    let queued: number | null = null;
    if (isAdmin) queued = (await adminReview(id, claims.sub, "published", null)).queued;
    revalidatePath("/");
    return { ok: true, data: { id, queued } };
  } catch {
    return { ok: false, error: "generic" };
  }
}

export async function reviewAction(formData: FormData): Promise<void> {
  const { claims, isAdmin } = await currentSession();
  if (!isAdmin) redirect("/");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  if (decision !== "published" && decision !== "rejected" && decision !== "cancelled") redirect("/admin");
  const r = await adminReview(id, claims.sub, decision, note);
  revalidatePath("/admin");
  revalidatePath("/");
  redirect(`/admin?done=${decision}&queued=${r.queued}`);
}
