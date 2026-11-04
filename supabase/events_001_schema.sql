-- Run on the Supabase project "boost33-brokers" (same database as Boost Off Market
-- and the Results app). Boost Events — tables and functions. Safe to re-run.
--
-- Access model, as the trade_* tables: RLS forced with NO policy, so the browser
-- roles (anon, authenticated) can read nothing. The app's server signs a
-- one-minute service_role token per call and only ever calls the events_*
-- functions below (src/lib/db.ts allow-list). Who is acting is passed as
-- p_person / p_actor; each function returns only what that person may see.

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  status          text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'cancelled')),
  kind            text not null default 'networking' check (kind in ('networking', 'startup', 'conference', 'trade_show', 'meetup', 'online')),
  title           text not null check (length(title) between 3 and 160),
  description     text,
  source_url      text,
  ticket_url      text,
  image_url       text,
  organiser       text,
  price           text not null default 'free' check (price in ('free', 'paid', 'invite')),
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  is_online       boolean not null default false,
  venue_name      text,
  address         text,
  city            text,
  lat             double precision,
  lng             double precision,
  push_radius_km  integer not null default 25 check (push_radius_km between 5 and 500),
  brokers_only    boolean not null default false,
  submitted_by    uuid not null,              -- b33 person id
  submitted_name  text,
  submitted_email text,
  reviewed_by     uuid,
  review_note     text,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint events_place check (is_online or (lat is not null and lng is not null))
);
create index if not exists events_status_starts_idx on public.events (status, starts_at);
create index if not exists events_submitted_by_idx on public.events (submitted_by);

create table if not exists public.events_rsvp (
  event_id   uuid not null references public.events (id) on delete cascade,
  person_id  uuid not null,
  created_at timestamptz not null default now(),
  primary key (event_id, person_id)
);

-- Where "near you" is measured from. Asked once, editable. One row per person.
create table if not exists public.events_member_locations (
  person_id  uuid primary key,
  city       text not null,
  lat        double precision not null,
  lng        double precision not null,
  radius_km  integer not null default 25 check (radius_km between 5 and 500),
  updated_at timestamptz not null default now()
);

-- The push queue. One row per (event, person); filled when an event is
-- published, drained by /api/cron/send-notifications.
create table if not exists public.events_notifications (
  id          bigserial primary key,
  event_id    uuid not null references public.events (id) on delete cascade,
  person_id   uuid not null,
  email       text not null,
  locale      text not null default 'en',
  channel     text not null default 'email' check (channel in ('email')),
  status      text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  attempts    integer not null default 0,
  provider_id text,
  error       text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  unique (event_id, person_id)
);
create index if not exists events_notifications_status_idx on public.events_notifications (status, created_at);

alter table public.events                  enable row level security;
alter table public.events                  force row level security;
alter table public.events_rsvp             enable row level security;
alter table public.events_rsvp             force row level security;
alter table public.events_member_locations enable row level security;
alter table public.events_member_locations force row level security;
alter table public.events_notifications    enable row level security;
alter table public.events_notifications    force row level security;

revoke all on public.events, public.events_rsvp, public.events_member_locations, public.events_notifications from anon, authenticated;

-- ── Helpers ─────────────────────────────────────────────────────────────────

-- Great-circle distance in km (haversine). Enough for "within 25 km".
create or replace function public.events_distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
as $$
  select 6371.0 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- One event as the app shows it in a list.
create or replace function public.events_row_json(e public.events, p_person uuid, p_lat double precision, p_lng double precision)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', e.id,
    'status', e.status,
    'kind', e.kind,
    'title', e.title,
    'organiser', e.organiser,
    'price', e.price,
    'image_url', e.image_url,
    'starts_at', e.starts_at,
    'ends_at', e.ends_at,
    'is_online', e.is_online,
    'venue_name', e.venue_name,
    'city', e.city,
    'lat', e.lat,
    'lng', e.lng,
    'distance_km', case when e.is_online or p_lat is null then null
                        else round(public.events_distance_km(p_lat, p_lng, e.lat, e.lng)::numeric, 1) end,
    'going', (select count(*) from public.events_rsvp r where r.event_id = e.id),
    'network_going', (select count(*) from public.events_rsvp r
                        join public.trade_members m on m.b33_person_id = r.person_id
                       where r.event_id = e.id and r.person_id <> p_person),
    'me_going', exists (select 1 from public.events_rsvp r where r.event_id = e.id and r.person_id = p_person)
  );
$$;

-- ── Member location ─────────────────────────────────────────────────────────

create or replace function public.events_get_location(p_person uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select to_jsonb(l) - 'person_id' from public.events_member_locations l where l.person_id = p_person), 'null'::jsonb);
$$;

create or replace function public.events_set_location(p_person uuid, p_city text, p_lat double precision, p_lng double precision, p_radius_km integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.events_member_locations (person_id, city, lat, lng, radius_km)
  values (p_person, p_city, p_lat, p_lng, coalesce(p_radius_km, 25))
  on conflict (person_id) do update
    set city = excluded.city, lat = excluded.lat, lng = excluded.lng, radius_km = excluded.radius_km, updated_at = now();
  return public.events_get_location(p_person);
end;
$$;

-- ── Reading events ──────────────────────────────────────────────────────────

-- Published upcoming events around the person (within their radius), plus online
-- ones. No location yet: online events only, and `location` is null so the app
-- asks for a city.
create or replace function public.events_near(p_person uuid, p_kind text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  l public.events_member_locations;
  v_broker boolean;
begin
  select * into l from public.events_member_locations where person_id = p_person;
  v_broker := exists (select 1 from public.trade_members m where m.b33_person_id = p_person and m.role in ('broker', 'sales'));

  return jsonb_build_object(
    'location', case when l.person_id is null then null else to_jsonb(l) - 'person_id' end,
    'events', coalesce((
      select jsonb_agg(public.events_row_json(e, p_person, l.lat, l.lng) order by e.starts_at)
        from public.events e
       where e.status = 'published'
         and coalesce(e.ends_at, e.starts_at + interval '3 hours') >= now()
         and (p_kind is null or e.kind = p_kind)
         and (not e.brokers_only or v_broker)
         and (e.is_online
              or (l.person_id is not null and public.events_distance_km(l.lat, l.lng, e.lat, e.lng) <= l.radius_km))
    ), '[]'::jsonb),
    'new_this_week', (
      select count(*) from public.events e
       where e.status = 'published' and e.published_at >= now() - interval '7 days'
         and coalesce(e.ends_at, e.starts_at + interval '3 hours') >= now()
         and (e.is_online or (l.person_id is not null and public.events_distance_km(l.lat, l.lng, e.lat, e.lng) <= l.radius_km))),
    'mine', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title, 'status', e.status, 'starts_at', e.starts_at) order by e.created_at desc)
        from public.events e where e.submitted_by = p_person and e.status <> 'cancelled'), '[]'::jsonb)
  );
end;
$$;

-- One event, with who from the network is going (members only; names and orgs,
-- as trade_members holds them). Pending/rejected events are visible to their
-- submitter and to admins (the app passes p_admin after its own check).
create or replace function public.events_get(p_event uuid, p_person uuid, p_admin boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  e public.events;
  l public.events_member_locations;
begin
  select * into e from public.events where id = p_event;
  if e.id is null then return null; end if;
  if e.status <> 'published' and not p_admin and e.submitted_by <> p_person then return null; end if;
  select * into l from public.events_member_locations where person_id = p_person;

  return public.events_row_json(e, p_person, l.lat, l.lng) || jsonb_build_object(
    'description', e.description,
    'source_url', e.source_url,
    'ticket_url', e.ticket_url,
    'address', e.address,
    'push_radius_km', e.push_radius_km,
    'brokers_only', e.brokers_only,
    'submitted_by', e.submitted_by,
    'submitted_name', e.submitted_name,
    'review_note', e.review_note,
    'published_at', e.published_at,
    'created_at', e.created_at,
    'mine', e.submitted_by = p_person,
    'network', coalesce((
      select jsonb_agg(jsonb_build_object('person_id', m.b33_person_id, 'name', m.full_name, 'org', m.org_name, 'role', m.role) order by r.created_at desc)
        from public.events_rsvp r join public.trade_members m on m.b33_person_id = r.person_id
       where r.event_id = e.id and r.person_id <> p_person), '[]'::jsonb)
  );
end;
$$;

-- ── Writing ─────────────────────────────────────────────────────────────────

create or replace function public.events_submit(p_person uuid, p_name text, p_email text, p_event jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.events (kind, title, description, source_url, ticket_url, image_url, organiser, price,
                             starts_at, ends_at, is_online, venue_name, address, city, lat, lng,
                             push_radius_km, brokers_only, submitted_by, submitted_name, submitted_email)
  values (coalesce(p_event->>'kind', 'networking'),
          p_event->>'title',
          nullif(p_event->>'description', ''),
          nullif(p_event->>'source_url', ''),
          nullif(p_event->>'ticket_url', ''),
          nullif(p_event->>'image_url', ''),
          nullif(p_event->>'organiser', ''),
          coalesce(p_event->>'price', 'free'),
          (p_event->>'starts_at')::timestamptz,
          nullif(p_event->>'ends_at', '')::timestamptz,
          coalesce((p_event->>'is_online')::boolean, false),
          nullif(p_event->>'venue_name', ''),
          nullif(p_event->>'address', ''),
          nullif(p_event->>'city', ''),
          nullif(p_event->>'lat', '')::double precision,
          nullif(p_event->>'lng', '')::double precision,
          coalesce((p_event->>'push_radius_km')::integer, 25),
          coalesce((p_event->>'brokers_only')::boolean, false),
          p_person, p_name, p_email)
  returning id into v_id;
  -- The submitter goes to their own event.
  insert into public.events_rsvp (event_id, person_id) values (v_id, p_person) on conflict do nothing;
  return v_id;
end;
$$;

create or replace function public.events_set_rsvp(p_person uuid, p_event uuid, p_going boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.events where id = p_event and status = 'published') then
    raise exception 'event_not_published';
  end if;
  if p_going then
    insert into public.events_rsvp (event_id, person_id) values (p_event, p_person) on conflict do nothing;
  else
    delete from public.events_rsvp where event_id = p_event and person_id = p_person;
  end if;
  return jsonb_build_object('going', (select count(*) from public.events_rsvp where event_id = p_event), 'me_going', p_going);
end;
$$;

-- ── Admin ───────────────────────────────────────────────────────────────────

create or replace function public.events_admin_list(p_status text default 'pending')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
    public.events_row_json(e, '00000000-0000-0000-0000-000000000000'::uuid, null, null)
      || jsonb_build_object('submitted_name', e.submitted_name, 'submitted_email', e.submitted_email, 'source_url', e.source_url,
                            'description', e.description, 'address', e.address, 'created_at', e.created_at, 'push_radius_km', e.push_radius_km)
    order by e.created_at desc), '[]'::jsonb)
  from public.events e
  where e.status = p_status;
$$;

-- Publish or reject. Publishing fills the push queue: every member who set a
-- location within the event's push radius (or everybody with a location, for an
-- online event), except the submitter. Returns how many were queued.
create or replace function public.events_admin_review(p_event uuid, p_actor uuid, p_decision text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.events;
  v_queued integer := 0;
begin
  if p_decision not in ('published', 'rejected', 'cancelled') then raise exception 'bad_decision'; end if;
  update public.events
     set status = p_decision, reviewed_by = p_actor, review_note = p_note, updated_at = now(),
         published_at = case when p_decision = 'published' then coalesce(published_at, now()) else published_at end
   where id = p_event
   returning * into e;
  if e.id is null then raise exception 'event_not_found'; end if;

  if p_decision = 'published' then
    insert into public.events_notifications (event_id, person_id, email, locale)
    select e.id, m.b33_person_id, m.email, coalesce(m.locale, 'en')
      from public.events_member_locations l
      join public.trade_members m on m.b33_person_id = l.person_id
     where m.email is not null
       and l.person_id <> e.submitted_by
       and (e.is_online or public.events_distance_km(l.lat, l.lng, e.lat, e.lng) <= e.push_radius_km)
       and (not e.brokers_only or m.role in ('broker', 'sales'))
    on conflict (event_id, person_id) do nothing;
    get diagnostics v_queued = row_count;
  end if;

  return jsonb_build_object('id', e.id, 'status', e.status, 'queued', v_queued);
end;
$$;

-- Admins may fix a fiche (typo, wrong address) without re-submitting.
create or replace function public.events_admin_update(p_event uuid, p_actor uuid, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.events set
    kind        = coalesce(p_patch->>'kind', kind),
    title       = coalesce(p_patch->>'title', title),
    description = coalesce(p_patch->>'description', description),
    organiser   = coalesce(p_patch->>'organiser', organiser),
    price       = coalesce(p_patch->>'price', price),
    starts_at   = coalesce((p_patch->>'starts_at')::timestamptz, starts_at),
    ends_at     = coalesce((p_patch->>'ends_at')::timestamptz, ends_at),
    venue_name  = coalesce(p_patch->>'venue_name', venue_name),
    address     = coalesce(p_patch->>'address', address),
    city        = coalesce(p_patch->>'city', city),
    lat         = coalesce((p_patch->>'lat')::double precision, lat),
    lng         = coalesce((p_patch->>'lng')::double precision, lng),
    ticket_url  = coalesce(p_patch->>'ticket_url', ticket_url),
    image_url   = coalesce(p_patch->>'image_url', image_url),
    reviewed_by = p_actor,
    updated_at  = now()
  where id = p_event;
  return jsonb_build_object('ok', found);
end;
$$;

-- ── The Hub's mini-map ──────────────────────────────────────────────────────

create or replace function public.events_hub_widget(p_person uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  l public.events_member_locations;
begin
  select * into l from public.events_member_locations where person_id = p_person;
  return jsonb_build_object(
    'location', case when l.person_id is null then null else jsonb_build_object('city', l.city, 'lat', l.lat, 'lng', l.lng, 'radius_km', l.radius_km) end,
    'new_this_week', (
      select count(*) from public.events e
       where e.status = 'published' and e.published_at >= now() - interval '7 days'
         and coalesce(e.ends_at, e.starts_at + interval '3 hours') >= now()
         and (e.is_online or (l.person_id is not null and public.events_distance_km(l.lat, l.lng, e.lat, e.lng) <= l.radius_km))),
    'events', coalesce((
      select jsonb_agg(x order by (x->>'starts_at')) from (
        select public.events_row_json(e, p_person, l.lat, l.lng) as x
          from public.events e
         where e.status = 'published'
           and coalesce(e.ends_at, e.starts_at + interval '3 hours') >= now()
           and not e.is_online
           and l.person_id is not null
           and public.events_distance_km(l.lat, l.lng, e.lat, e.lng) <= l.radius_km
         order by e.starts_at
         limit 6) s), '[]'::jsonb)
  );
end;
$$;

-- ── The push queue ──────────────────────────────────────────────────────────

-- Hand a batch to the sender and mark it `sending`, so two cron runs never send
-- the same row twice. Rows that failed fewer than 3 times are retried.
create or replace function public.events_notifications_claim(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  with picked as (
    select n.id from public.events_notifications n
     where n.status in ('queued', 'failed') and n.attempts < 3
     order by n.created_at
     limit p_limit
     for update skip locked
  ), upd as (
    update public.events_notifications n set status = 'sending', attempts = n.attempts + 1
      from picked where n.id = picked.id
    returning n.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id, 'email', u.email, 'locale', u.locale, 'person_id', u.person_id,
      'event', public.events_row_json(e, u.person_id, l.lat, l.lng) || jsonb_build_object('address', e.address, 'description', e.description))), '[]'::jsonb)
    into v
    from upd u
    join public.events e on e.id = u.event_id
    left join public.events_member_locations l on l.person_id = u.person_id;
  return v;
end;
$$;

create or replace function public.events_notifications_mark(p_id bigint, p_status text, p_provider_id text default null, p_error text default null)
returns void
language sql
security definer
set search_path = public
as $$
  update public.events_notifications
     set status = p_status, provider_id = coalesce(p_provider_id, provider_id), error = p_error,
         sent_at = case when p_status = 'sent' then now() else sent_at end
   where id = p_id;
$$;

-- ── Grants: the server's service_role only ──────────────────────────────────

do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'events\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
