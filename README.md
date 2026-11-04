# Boost33 Events

Business, startup and networking events around the members of the Boost33
network, on a map, with "who from your network is going" and a push to the
members within reach. Lives at `events.boost33.com`, behind the Boost33 session
(Identity), and shows up on the Hub's home as a mini-map.

Built like `boost33-results`: one Next.js app, no database of its own — its
tables live on the Supabase project **boost33-brokers** (next to `trade_*`),
reached only through `events_*` functions with a one-minute `service_role`
token signed per call.

## Screens

| Route | What |
| --- | --- |
| `/` | Events near you: filters, main card (new this week, network going, one row per event), map in the rail. Asks for a city the first time. |
| `/events/[id]` | The fiche: date, venue map, who from the network is going, "I'm going", calendar, tickets. |
| `/events/new` | Propose an event: paste a link (Eventbrite, Luma, Meetup… read through schema.org JSON-LD / OpenGraph) or fill the form; address geocoded. Admins' events publish straight away, others wait for review. |
| `/mine` | The events the person is going to, and the ones they proposed. |
| `/admin` | Review queue (staff and `ADMIN_EMAILS`): publish, reject, cancel. Publishing queues the push. |
| `GET /api/hub-widget?person=<id>` | For the Hub's mini-map. `Authorization: Bearer <HUB_WIDGET_KEY>`. |
| `GET /api/cron/send-notifications` | Drains the push queue (Vercel cron, every 10 min, `CRON_SECRET`). |

FR and EN from the start (`src/messages/*.json`, next-intl, no URL prefix: the
language comes from `?lang=` then a cookie; EN is the default).

## Data (`supabase/events_001_schema.sql`)

- `events` — one row per event, `status` pending → published / rejected / cancelled.
- `events_rsvp` — who is going.
- `events_member_locations` — the person's city, coordinates and radius ("near you" is measured from here).
- `events_notifications` — the push queue, one row per (event, person), drained by the cron.

Functions: `events_near`, `events_get`, `events_get_location`,
`events_set_location`, `events_submit`, `events_set_rsvp`, `events_admin_list`,
`events_admin_review` (publishing fills the queue), `events_admin_update`,
`events_hub_widget`, `events_notifications_claim`, `events_notifications_mark`.
All `security definer`, granted to `service_role` only.

Apply the migration with the Supabase SQL editor (or the MCP `apply_migration`)
on the brokers project. Safe to re-run.

## Settings

See `.env.example`. The map and the geocoder need `NEXT_PUBLIC_MAPTILER_KEY`;
the push needs `RESEND_API_KEY` (and a verified sender in `MAIL_FROM`).

## Local development

```bash
npm install
npm run dev         # simulated session (?as=sales|broker|client), fixtures when no database is configured
npm run typecheck && npm run lint && npm test
```

## Release

Feature branch → Vercel preview → Arthur validates → merge to `main` (`--no-ff`).
Never promote a preview to production.
