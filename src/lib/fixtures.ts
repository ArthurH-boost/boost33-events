import type { EventKind } from "./config";
import type { EventDetail, EventRow, Near, SearchCentre } from "./events";

/**
 * What the screens show when no database is configured (local dev without
 * env). Rennes, because that is where the first members are. Nothing here is
 * real: titles and venues are placeholders for layout work.
 */
const RENNES = { city: "Rennes", lat: 48.1173, lng: -1.6778, radius_km: 25 };

const days = (n: number, h: number, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const ROWS: EventRow[] = [
  { id: "f1", status: "published", kind: "networking", title: "Afterwork Startups Rennes", organiser: "French Tech Rennes St Malo", price: "free", image_url: null, starts_at: days(2, 18, 30), ends_at: days(2, 21, 30), is_online: false, online_platform: null, online_url: null, venue_name: "Le Mabilay", city: "Rennes", lat: 48.1106, lng: -1.6932, distance_km: 2.1, going: 12, network_going: 4, me_going: false },
  { id: "f2", status: "published", kind: "conference", title: "Petit-déj financement public : CIR, Bpifrance, OPCO", organiser: "CCI Ille-et-Vilaine", price: "free", image_url: null, starts_at: days(6, 8, 30), ends_at: days(6, 10, 0), is_online: false, online_platform: null, online_url: null, venue_name: "CCI Ille-et-Vilaine", city: "Rennes", lat: 48.1086, lng: -1.6811, distance_km: 1.4, going: 5, network_going: 2, me_going: true },
  { id: "f3", status: "published", kind: "trade_show", title: "Salon Entreprendre Ouest 2026", organiser: "Entreprendre Ouest", price: "paid", image_url: null, starts_at: days(8, 9, 0), ends_at: days(9, 18, 0), is_online: false, online_platform: null, online_url: null, venue_name: "Parc Expo Rennes", city: "Bruz", lat: 48.0675, lng: -1.7336, distance_km: 6.8, going: 9, network_going: 7, me_going: false },
  { id: "f4", status: "published", kind: "meetup", title: "Meetup IA & automatisation B2B", organiser: "Le Poool", price: "free", image_url: null, starts_at: days(15, 19, 0), ends_at: null, is_online: false, online_platform: null, online_url: null, venue_name: "Le Poool", city: "Rennes", lat: 48.1265, lng: -1.6407, distance_km: 3.2, going: 3, network_going: 0, me_going: false },
  { id: "f5", status: "published", kind: "startup", title: "Pitch Night Bretagne", organiser: "Bretagne Développement Innovation", price: "invite", image_url: null, starts_at: days(17, 18, 0), ends_at: null, is_online: false, online_platform: null, online_url: null, venue_name: "Les Champs Libres", city: "Rennes", lat: 48.1047, lng: -1.6725, distance_km: 1.9, going: 6, network_going: 3, me_going: false },
  { id: "f6", status: "published", kind: "online", title: "Webinaire : prospection LinkedIn, ce qui marche en 2027", organiser: "Boost33", price: "free", image_url: null, starts_at: days(21, 12, 30), ends_at: days(21, 13, 15), is_online: true, online_platform: "zoom", online_url: "https://zoom.us/j/0000000000", venue_name: null, city: null, lat: null, lng: null, distance_km: null, going: 20, network_going: 1, me_going: false },
  { id: "f7", status: "published", kind: "online", title: "Live Twitch : on monte une campagne Outbound en direct", organiser: "Boost33", price: "free", image_url: null, starts_at: days(3, 18, 0), ends_at: days(3, 19, 0), is_online: true, online_platform: "twitch", online_url: "https://www.twitch.tv/boost33", venue_name: null, city: null, lat: null, lng: null, distance_km: null, going: 8, network_going: 2, me_going: false },
  { id: "f8", status: "published", kind: "online", title: "Live shopping B2B : déstockage matériel de bureau", organiser: "Atelier Lumen", price: "free", image_url: null, starts_at: days(5, 20, 0), ends_at: null, is_online: true, online_platform: "whatnot", online_url: "https://www.whatnot.com/live/example", venue_name: null, city: null, lat: null, lng: null, distance_km: null, going: 4, network_going: 0, me_going: false },
  { id: "f10", status: "published", kind: "networking", title: "Apéro entrepreneurs Nantes", organiser: "Réseau Entreprendre Atlantique", price: "free", image_url: null, starts_at: days(4, 18, 30), ends_at: null, is_online: false, online_platform: null, online_url: null, venue_name: "Le Lieu Unique", city: "Nantes", lat: 47.2153, lng: -1.5455, distance_km: null, going: 7, network_going: 1, me_going: false },
];

/** As events_near does it: online events for everybody, the others within the radius of the centre. */
export function FIXTURE_NEAR(kind: EventKind | null, search: SearchCentre | null = null): Near {
  const c = search ? { ...search, radius_km: search.radius_km ?? RENNES.radius_km } : RENNES;
  const events = ROWS.filter((e) => !kind || e.kind === kind)
    .map((e) => (e.is_online || e.lat == null || e.lng == null ? e : { ...e, distance_km: Math.round(distanceKm(c.lat, c.lng, e.lat, e.lng) * 10) / 10 }))
    .filter((e) => e.is_online || (e.distance_km != null && e.distance_km <= c.radius_km))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return {
    location: RENNES,
    events,
    new_this_week: 3,
    mine: [{ id: "f9", title: "Café des indépendants", status: "pending", starts_at: days(12, 9, 0) }],
  };
}

export function fixtureEvent(id: string): EventDetail | null {
  const row = ROWS.find((e) => e.id === id);
  if (!row) return null;
  return {
    ...row,
    description:
      "Soirée mensuelle de l'écosystème startup rennais. Format libre : pas de pitch, pas de table ronde, des fondateurs, des investisseurs et des partenaires qui se rencontrent autour d'un verre.\n\nThème du mois : IA appliquée aux PME.",
    source_url: "https://example.com/event",
    ticket_url: "https://example.com/tickets",
    address: "2 rue de la Mabilais, 35000 Rennes",
    push_radius_km: 25,
    brokers_only: false,
    submitted_by: "00000000-0000-4000-8000-0000000000a1",
    submitted_name: "Dezys",
    review_note: null,
    published_at: days(-2, 10),
    created_at: days(-3, 10),
    mine: false,
    network: [
      { person_id: "p1", name: "Marie L.", org: "Martin Conseil", role: "broker" },
      { person_id: "p2", name: "Thomas B.", org: "Agence web", role: "client" },
      { person_id: "p3", name: "Sarah K.", org: "SaaS RH", role: "client" },
      { person_id: "p4", name: "Julien D.", org: "Expert-comptable", role: "broker" },
    ].slice(0, row.network_going),
  };
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = (x: number) => (x * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
