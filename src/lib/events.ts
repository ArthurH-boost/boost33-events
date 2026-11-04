import "server-only";
import { brokersConfigured, callValue } from "./db";
import type { EventKind } from "./config";
import { FIXTURE_NEAR, fixtureEvent } from "./fixtures";

/** One event as the list shows it (`events_row_json`). */
export type EventRow = {
  id: string;
  status: "pending" | "published" | "rejected" | "cancelled";
  kind: EventKind;
  title: string;
  organiser: string | null;
  price: "free" | "paid" | "invite";
  image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  is_online: boolean;
  venue_name: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
  going: number;
  network_going: number;
  me_going: boolean;
};

export type EventDetail = EventRow & {
  description: string | null;
  source_url: string | null;
  ticket_url: string | null;
  address: string | null;
  push_radius_km: number;
  brokers_only: boolean;
  submitted_by: string;
  submitted_name: string | null;
  review_note: string | null;
  published_at: string | null;
  created_at: string;
  mine: boolean;
  network: Array<{ person_id: string; name: string | null; org: string | null; role: string }>;
};

export type MemberLocation = { city: string; lat: number; lng: number; radius_km: number; updated_at?: string };

export type Near = {
  location: MemberLocation | null;
  events: EventRow[];
  new_this_week: number;
  mine: Array<{ id: string; title: string; status: EventRow["status"]; starts_at: string }>;
};

export type AdminRow = EventRow & {
  submitted_name: string | null;
  submitted_email: string | null;
  source_url: string | null;
  description: string | null;
  address: string | null;
  created_at: string;
  push_radius_km: number;
};

export type HubWidget = {
  location: MemberLocation | null;
  new_this_week: number;
  events: EventRow[];
};

/** Without a database (local dev with no env), the app runs on fixtures so the screens can be worked on. */
const live = () => brokersConfigured();

export async function eventsNear(person: string, kind: EventKind | null): Promise<Near> {
  if (!live()) return FIXTURE_NEAR(kind);
  return callValue<Near>("events_near", { p_person: person, p_kind: kind });
}

export async function eventGet(id: string, person: string, admin: boolean): Promise<EventDetail | null> {
  if (!live()) return fixtureEvent(id);
  return callValue<EventDetail | null>("events_get", { p_event: id, p_person: person, p_admin: admin });
}

export async function locationGet(person: string): Promise<MemberLocation | null> {
  if (!live()) return FIXTURE_NEAR(null).location;
  return callValue<MemberLocation | null>("events_get_location", { p_person: person });
}

export async function locationSet(person: string, city: string, lat: number, lng: number, radiusKm: number): Promise<MemberLocation> {
  if (!live()) return { city, lat, lng, radius_km: radiusKm };
  return callValue<MemberLocation>("events_set_location", { p_person: person, p_city: city, p_lat: lat, p_lng: lng, p_radius_km: radiusKm });
}

export type NewEvent = {
  kind: EventKind;
  title: string;
  description?: string;
  source_url?: string;
  ticket_url?: string;
  image_url?: string;
  organiser?: string;
  price: "free" | "paid" | "invite";
  starts_at: string;
  ends_at?: string;
  is_online: boolean;
  venue_name?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  push_radius_km: number;
  brokers_only: boolean;
};

export async function eventSubmit(person: string, name: string | null, email: string | null, event: NewEvent): Promise<string> {
  if (!live()) return "fixture-new";
  return callValue<string>("events_submit", { p_person: person, p_name: name, p_email: email, p_event: event });
}

export async function rsvpSet(person: string, event: string, going: boolean): Promise<{ going: number; me_going: boolean }> {
  if (!live()) return { going: going ? 1 : 0, me_going: going };
  return callValue("events_set_rsvp", { p_person: person, p_event: event, p_going: going });
}

export async function adminList(status: "pending" | "published" | "rejected"): Promise<AdminRow[]> {
  if (!live()) return [];
  return callValue<AdminRow[]>("events_admin_list", { p_status: status });
}

export async function adminReview(event: string, actor: string, decision: "published" | "rejected" | "cancelled", note: string | null): Promise<{ id: string; status: string; queued: number }> {
  if (!live()) return { id: event, status: decision, queued: 0 };
  return callValue("events_admin_review", { p_event: event, p_actor: actor, p_decision: decision, p_note: note });
}

export async function hubWidget(person: string): Promise<HubWidget> {
  if (!live()) {
    const n = FIXTURE_NEAR(null);
    return { location: n.location, new_this_week: n.new_this_week, events: n.events.filter((e) => !e.is_online).slice(0, 6) };
  }
  return callValue<HubWidget>("events_hub_widget", { p_person: person });
}

export type QueuedNotification = {
  id: number;
  email: string;
  locale: string;
  person_id: string;
  event: EventRow & { address: string | null; description: string | null };
};

export async function notificationsClaim(limit: number): Promise<QueuedNotification[]> {
  if (!live()) return [];
  return callValue<QueuedNotification[]>("events_notifications_claim", { p_limit: limit });
}

export async function notificationMark(id: number, status: "sent" | "failed" | "skipped", providerId: string | null, error: string | null): Promise<void> {
  if (!live()) return;
  await callValue("events_notifications_mark", { p_id: id, p_status: status, p_provider_id: providerId, p_error: error });
}
