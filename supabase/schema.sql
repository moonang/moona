-- =====================================================================
-- Moona database schema (Supabase / Postgres)
-- Moona is a product of Sports DNA Ltd.
-- Version 1.1 (24 Nov 2026). Safe to run again over an earlier version.
-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Organisers (one row per signed-in host) ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  phone        text,
  created_at   timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Events ----------
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  kind          text not null default 'other',
  visibility    text not null default 'private' check (visibility in ('public','private')),
  title         text not null check (char_length(title) between 2 and 120),
  host_name     text not null check (char_length(host_name) between 2 and 120),
  about         text not null default '',
  starts_at     timestamptz not null,
  duration_min  int not null default 120 check (duration_min between 15 and 20160),
  tz            text not null default 'Africa/Lagos',
  mode          text not null default 'In person' check (mode in ('In person','Online')),
  venue         text not null default '',      -- full address or link (private until approved if hide_address)
  area          text not null default '',      -- what everyone sees when the address is hidden
  hide_address  boolean not null default false,
  approval      boolean not null default false,
  allow_plus    boolean not null default false,
  max_plus      int not null default 0 check (max_plus between 0 and 5),
  capacity      int not null default 50 check (capacity between 1 and 100000),
  currency      text not null default 'NGN' check (currency in ('NGN','GBP')),
  certificate   boolean not null default false,
  cpd_hours     numeric(4,1) not null default 0,
  sponsors      text[] not null default '{}',
  status        text not null default 'published' check (status in ('draft','published','cancelled')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists events_public_idx on public.events (visibility, status, starts_at);
create index if not exists events_owner_idx on public.events (owner_id);

create table if not exists public.ticket_tiers (
  id        uuid primary key default gen_random_uuid(),
  event_id  uuid not null references public.events(id) on delete cascade,
  name      text not null,
  price     int not null default 0 check (price >= 0),   -- in naira / pounds (whole units)
  position  int not null default 0
);

create table if not exists public.event_questions (
  id        uuid primary key default gen_random_uuid(),
  event_id  uuid not null references public.events(id) on delete cascade,
  label     text not null,
  is_child  boolean not null default false,              -- triggers the parent/guardian consent box
  position  int not null default 0
);

-- ---------- RSVPs (guests) ----------
create table if not exists public.rsvps (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  tier_id       uuid references public.ticket_tiers(id) on delete set null,
  name          text not null check (char_length(name) between 2 and 120),
  phone         text not null check (char_length(phone) between 6 and 30),
  email         text,
  plus          int not null default 0,
  status        text not null default 'going' check (status in ('going','maybe','pending','declined','cancelled')),
  answers       jsonb not null default '{}'::jsonb,
  guardian_consent_at timestamptz,                       -- set when a parent/guardian consents for a child
  code          text not null unique,                    -- pass code shown in the QR
  manage_token  uuid not null default gen_random_uuid(), -- secret link the guest uses to view/change their RSVP
  payment_status text not null default 'none' check (payment_status in ('none','pending','paid','refunded')),
  payment_ref   text,
  amount_paid   int not null default 0,
  checked_in_at timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists rsvps_event_idx on public.rsvps (event_id, status);

-- ---------- Bring list ----------
create table if not exists public.bring_items (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  item       text not null,
  rsvp_id    uuid references public.rsvps(id) on delete set null,
  position   int not null default 0
);

-- =====================================================================
-- Row-level security
-- Guests never sign in: they RSVP through server code (service role),
-- which validates every field. Organisers sign in and can only touch
-- their own events and guest lists.
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.events          enable row level security;
alter table public.ticket_tiers    enable row level security;
alter table public.event_questions enable row level security;
alter table public.rsvps           enable row level security;
alter table public.bring_items     enable row level security;

-- Profiles: you see and edit your own.
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Events: anyone can read PUBLIC published events. Private events are only
-- served by slug through server code (so they can't be listed or searched).
drop policy if exists "public events readable" on public.events;
create policy "public events readable" on public.events for select
  using (visibility = 'public' and status = 'published');
drop policy if exists "owner reads own events" on public.events;
create policy "owner reads own events" on public.events for select using (auth.uid() = owner_id);
drop policy if exists "owner creates events" on public.events;
create policy "owner creates events"   on public.events for insert with check (auth.uid() = owner_id);
drop policy if exists "owner updates events" on public.events;
create policy "owner updates events"   on public.events for update using (auth.uid() = owner_id);
drop policy if exists "owner deletes events" on public.events;
create policy "owner deletes events"   on public.events for delete using (auth.uid() = owner_id);

-- Tiers, questions, bring items: readable with a public event; writable by the owner.
drop policy if exists "tiers read" on public.ticket_tiers;
create policy "tiers read"  on public.ticket_tiers for select using (
  exists (select 1 from public.events e where e.id = event_id and (e.owner_id = auth.uid() or (e.visibility='public' and e.status='published'))));
drop policy if exists "tiers write" on public.ticket_tiers;
create policy "tiers write" on public.ticket_tiers for all using (
  exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

drop policy if exists "questions read" on public.event_questions;
create policy "questions read"  on public.event_questions for select using (
  exists (select 1 from public.events e where e.id = event_id and (e.owner_id = auth.uid() or (e.visibility='public' and e.status='published'))));
drop policy if exists "questions write" on public.event_questions;
create policy "questions write" on public.event_questions for all using (
  exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

drop policy if exists "bring read" on public.bring_items;
create policy "bring read"  on public.bring_items for select using (
  exists (select 1 from public.events e where e.id = event_id and (e.owner_id = auth.uid() or (e.visibility='public' and e.status='published'))));
drop policy if exists "bring write" on public.bring_items;
create policy "bring write" on public.bring_items for all using (
  exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

-- RSVPs: only the event owner can read or change their guest list.
-- (Guests create and view RSVPs through server code using their manage_token.)
drop policy if exists "owner reads rsvps" on public.rsvps;
create policy "owner reads rsvps"   on public.rsvps for select using (
  exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
drop policy if exists "owner updates rsvps" on public.rsvps;
create policy "owner updates rsvps" on public.rsvps for update using (
  exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

-- Public headcount without exposing names: a view counting confirmed guests.
create or replace view public.event_counts with (security_invoker = false) as
  select event_id,
         coalesce(sum(1 + plus) filter (where status = 'going'), 0)::int as going,
         count(*) filter (where status = 'maybe')::int as maybe
  from public.rsvps group by event_id;
grant select on public.event_counts to anon, authenticated;

-- Keep updated_at fresh.
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();

-- =====================================================================
-- Moona admin (Sports DNA team): approve What's On listings, feature
-- events, and add events on behalf of partner organisers.
-- =====================================================================
alter table public.profiles add column if not exists is_admin boolean not null default false;

alter table public.events add column if not exists listing_status text not null default 'pending'
  check (listing_status in ('pending','approved','rejected'));          -- only 'approved' public events appear on What's On
alter table public.events add column if not exists featured boolean not null default false;  -- pinned to the top of What's On
alter table public.events add column if not exists added_by uuid references public.profiles(id); -- admin who added it for a partner
alter table public.events add column if not exists handover_email text;                      -- partner's email; ownership moves to them when they sign in
alter table public.events add column if not exists review_note text;                          -- reason shown to the organiser if a listing is declined

create index if not exists events_listing_idx on public.events (visibility, listing_status, featured desc, starts_at);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- Public listing now requires approval.
drop policy if exists "public events readable" on public.events;
drop policy if exists "public events readable" on public.events;
create policy "public events readable" on public.events for select
  using (visibility = 'public' and status = 'published' and listing_status = 'approved');

-- Admins can see and manage every event (but organisers' guest lists stay with organisers).
drop policy if exists "admins read all events" on public.events;
create policy "admins read all events"   on public.events for select using (public.is_admin());
drop policy if exists "admins update all events" on public.events;
create policy "admins update all events" on public.events for update using (public.is_admin());
drop policy if exists "admins create events" on public.events;
create policy "admins create events"     on public.events for insert with check (public.is_admin());

-- Organisers can't approve or feature their own listings.
create or replace function public.guard_listing_fields() returns trigger language plpgsql as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.listing_status := 'pending'; new.featured := false;
    else
      new.listing_status := old.listing_status; new.featured := old.featured;
      -- an organiser editing an approved public event keeps its approval; switching private -> public re-queues it
      if old.visibility = 'private' and new.visibility = 'public' then new.listing_status := 'pending'; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists events_guard_listing on public.events;
create trigger events_guard_listing before insert or update on public.events
  for each row execute function public.guard_listing_fields();

-- Hand events over: when a partner signs in with the handover email, they become the owner.
create or replace function public.claim_handover_events() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.events set owner_id = new.id, handover_email = null
   where handover_email is not null and lower(handover_email) = lower((select email from auth.users where id = new.id));
  return new;
end $$;
drop trigger if exists on_profile_created_claim on public.profiles;
create trigger on_profile_created_claim after insert on public.profiles
  for each row execute function public.claim_handover_events();

-- Make yourself an admin (run once, with your sign-in email):
-- update public.profiles set is_admin = true where id = (select id from auth.users where email = 'you@example.com');

-- =====================================================================
-- Plans: Moona (free, up to 100 guests per event), Moona Pro (annual),
-- and Event Boost (one-off, lifts the cap for a single event).
-- =====================================================================
alter table public.profiles add column if not exists pro_until timestamptz;            -- Moona Pro is active while now() < pro_until (annual billing)
alter table public.events   add column if not exists boosted boolean not null default false; -- Event Boost bought for this event

create or replace function public.guest_cap(e public.events) returns int
language sql stable security definer set search_path = public as $$
  select case
    when e.boosted then 100000
    when exists (select 1 from public.profiles p where p.id = e.owner_id and p.pro_until > now()) then 100000
    else 100 end
$$;

-- Organisers can't grant themselves Pro or Boost; only payments (server) and admins can.
create or replace function public.guard_plan_fields() returns trigger language plpgsql as $$
begin
  if not public.is_admin() and current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    if tg_op = 'UPDATE' then new.boosted := old.boosted; else new.boosted := false; end if;
  end if;
  return new;
end $$;
drop trigger if exists events_guard_plan on public.events;
create trigger events_guard_plan before insert or update on public.events for each row execute function public.guard_plan_fields();

-- Early-subscriber price lock: the price paid on first subscribing is kept for two years.
-- Set by the payment webhook on FIRST Pro purchase: pro_price_ngn = price paid, pro_price_locked_until = now() + interval '2 years'.
-- Renewals charge pro_price_ngn while now() < pro_price_locked_until, otherwise the current list price.
alter table public.profiles add column if not exists pro_price_ngn int;
alter table public.profiles add column if not exists pro_price_locked_until timestamptz;

create or replace function public.guard_profile_plan() returns trigger language plpgsql as $$
begin
  if not public.is_admin() and current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    new.pro_until := old.pro_until; new.is_admin := old.is_admin;
    new.pro_price_ngn := old.pro_price_ngn; new.pro_price_locked_until := old.pro_price_locked_until;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_plan on public.profiles;
create trigger profiles_guard_plan before update on public.profiles for each row execute function public.guard_profile_plan();

-- =====================================================================
-- Cities: What's On is per city. Launch: Lagos. Next: Abuja, Port Harcourt,
-- Enugu, Ibadan. Add a city by inserting a row; no code change needed.
-- =====================================================================
create table if not exists public.cities (
  slug      text primary key check (slug ~ '^[a-z-]{2,40}$'),
  name      text not null,
  live      boolean not null default false,   -- shown in the What's On city switcher when true
  position  int not null default 0
);
alter table public.cities enable row level security;
drop policy if exists "cities readable" on public.cities;
create policy "cities readable" on public.cities for select using (true);
drop policy if exists "admins manage cities" on public.cities;
create policy "admins manage cities" on public.cities for all using (public.is_admin()) with check (public.is_admin());

insert into public.cities (slug, name, live, position) values
  ('lagos','Lagos',true,1), ('abuja','Abuja',false,2), ('port-harcourt','Port Harcourt',false,3),
  ('enugu','Enugu',false,4), ('ibadan','Ibadan',false,5)
on conflict (slug) do nothing;

alter table public.events add column if not exists city text not null default 'lagos' references public.cities(slug);
create index if not exists events_city_idx on public.events (city, visibility, listing_status, starts_at);

-- ── Repeating events (Team training, PTA meetings, supper clubs) ──────────────
-- One event = one link for the whole season. starts_at is the FIRST session;
-- later sessions are generated from repeat_freq + repeat_count.
alter table public.events add column if not exists repeat_freq text
  check (repeat_freq in ('weekly','fortnightly','monthly'));          -- null = one-off
alter table public.events add column if not exists repeat_count int
  check (repeat_count is null or repeat_count between 2 and 52);
-- Which session a guest said yes to. null = every session.
alter table public.rsvps add column if not exists occurrence_date timestamptz;
create index if not exists rsvps_occurrence_idx on public.rsvps (event_id, occurrence_date);
-- Note: the 100-guest free cap counts guests PER SESSION (every-session guests count in each one).

-- ── Single-session changes and per-session check-in ──────────────────────────
-- Move or cancel ONE session without touching the rest of the season.
create table if not exists public.event_exceptions (
  event_id      uuid not null references public.events(id) on delete cascade,
  original_at   timestamptz not null,          -- the session's generated date (stable key)
  cancelled     boolean not null default false,
  moved_to      timestamptz,                   -- new date/time if moved
  created_at    timestamptz not null default now(),
  primary key (event_id, original_at)
);
alter table public.event_exceptions enable row level security;
drop policy if exists "exceptions readable with event" on public.event_exceptions;
create policy "exceptions readable with event" on public.event_exceptions for select using (true);
drop policy if exists "owner manages exceptions" on public.event_exceptions;
create policy "owner manages exceptions" on public.event_exceptions for all
  using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

-- One row per guest per session attended (repeating events). One-off events keep rsvps.checked_in_at.
create table if not exists public.checkins (
  rsvp_id       uuid not null references public.rsvps(id) on delete cascade,
  occurrence_at timestamptz not null,
  checked_in_at timestamptz not null default now(),
  primary key (rsvp_id, occurrence_at)
);
alter table public.checkins enable row level security;
drop policy if exists "owner manages checkins" on public.checkins;
create policy "owner manages checkins" on public.checkins for all
  using (exists (select 1 from public.rsvps r join public.events e on e.id = r.event_id where r.id = rsvp_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.rsvps r join public.events e on e.id = r.event_id where r.id = rsvp_id and e.owner_id = auth.uid()));

alter table public.events add column if not exists auto_remind boolean not null default false; -- WhatsApp reminder the day before each session

-- ── Introductory Pro offer: first 500 subscribers only ───────────────────────
-- Call from the payment webhook (service role) on a user's FIRST Pro purchase.
-- Returns the annual price to charge and, if within the first 500, locks it for 2 years.
-- The advisory lock stops two simultaneous payments both taking spot 500.
create or replace function public.claim_pro_price(uid uuid, intro_price int default 50000, list_price int default 100000)
returns int language plpgsql security definer set search_path = public as $$
declare taken int; already int;
begin
  perform pg_advisory_xact_lock(hashtext('moona-early-pro'));
  select pro_price_ngn into already from profiles where id = uid and pro_price_locked_until is not null;
  if already is not null then return already; end if;            -- already an early subscriber
  select count(*) into taken from profiles where pro_price_locked_until is not null;
  if taken < 500 then
    update profiles set pro_price_ngn = intro_price, pro_price_locked_until = now() + interval '2 years' where id = uid;
    return intro_price;
  end if;
  if list_price is null then raise exception 'Introductory offer closed: set the list price'; end if;
  return list_price;
end $$;
revoke all on function public.claim_pro_price(uuid,int,int) from public, anon, authenticated;

-- ── Celebration themes ───────────────────────────────────────────────────────
-- Fixed-date and computed celebrations (Christmas, Independence, Easter, Mother's/Father's Day…)
-- live in code (lib/celebrations.ts). Moon-sighted ones (Ramadan, Eid al-Fitr, Eid al-Adha,
-- Eid-el-Maulud) are computed automatically from the Umm al-Qura calendar; rows here are OPTIONAL
-- admin overrides when Nigeria's sighting differs by a day, or to switch a celebration off.
create table if not exists public.celebration_dates (
  celebration  text not null,                  -- 'ramadan' | 'eidfitr' | 'eidkabir' | 'eidmaulud' | any override
  starts_on    date not null,
  ends_on      date not null check (ends_on >= starts_on),
  confirmed    boolean not null default false,  -- false = provisional (banner says "date follows the moon sighting")
  enabled      boolean not null default true,   -- admin can switch a celebration off for a year
  primary key (celebration, starts_on)
);
alter table public.celebration_dates enable row level security;
drop policy if exists "celebrations public read" on public.celebration_dates;
create policy "celebrations public read" on public.celebration_dates for select using (true);
drop policy if exists "admins manage celebrations" on public.celebration_dates;
create policy "admins manage celebrations" on public.celebration_dates for all using (public.is_admin()) with check (public.is_admin());
insert into public.celebration_dates (celebration, starts_on, ends_on) values
  ('ramadan','2027-02-08','2027-03-08'), ('eidfitr','2027-03-09','2027-03-11'),
  ('eidkabir','2027-05-16','2027-05-18'), ('eidmaulud','2027-08-14','2027-08-15')
on conflict do nothing;

-- Admin-made celebration themes (one-off or yearly), e.g. AFCON final, brand anniversary.
create table if not exists public.custom_celebrations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 40),
  emoji       text not null default '🎉' check (char_length(emoji) <= 8),
  greeting    text check (char_length(greeting) <= 60),
  message     text check (char_length(message) <= 120),
  colour_main text not null default '#FF1F8E' check (colour_main ~ '^#[0-9A-Fa-f]{6}$'),
  colour_two  text not null default '#FFC41F' check (colour_two ~ '^#[0-9A-Fa-f]{6}$'),
  button_kind text,                              -- occasion the button opens in Create (null = no button)
  button_text text check (char_length(button_text) <= 40),
  starts_on   date not null,
  ends_on     date not null check (ends_on >= starts_on),
  yearly      boolean not null default false,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
alter table public.custom_celebrations enable row level security;
drop policy if exists "custom celebrations public read" on public.custom_celebrations;
create policy "custom celebrations public read" on public.custom_celebrations for select using (true);
drop policy if exists "admins manage custom celebrations" on public.custom_celebrations;
create policy "admins manage custom celebrations" on public.custom_celebrations for all using (public.is_admin()) with check (public.is_admin());

-- ── Email confirmations, optional WhatsApp, flyers (added 22 Nov 2026) ────────
-- Email is now the required contact (confirmations are emailed); WhatsApp is optional.
alter table public.rsvps alter column phone drop not null;
alter table public.rsvps drop constraint if exists rsvps_email_format;
alter table public.rsvps add constraint rsvps_email_format
  check (email is null or (char_length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$')) not valid;
alter table public.rsvps add column if not exists confirmation_sent_at timestamptz;

-- The host's own flyer (free and Pro). Public image URL from the "flyers" storage bucket.
alter table public.events add column if not exists flyer_url text;
alter table public.events drop constraint if exists events_flyer_url_https;
alter table public.events add constraint events_flyer_url_https check (flyer_url is null or flyer_url ~ '^https://') not valid;

-- Storage bucket for flyers: images only (JPG, PNG, WebP), up to 10 MB. Files are readable by URL,
-- but nobody can LIST the bucket (so private events' flyers can't be discovered). Hosts can only
-- write inside their own folder: flyers/<their user id>/...
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('flyers', 'flyers', true, 10485760, array['image/jpeg','image/png','image/webp'])
    on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

    drop policy if exists "flyers: hosts upload to own folder" on storage.objects;
    create policy "flyers: hosts upload to own folder" on storage.objects for insert to authenticated
      with check (bucket_id = 'flyers' and (storage.foldername(name))[1] = auth.uid()::text);
    drop policy if exists "flyers: hosts see own files" on storage.objects;
    create policy "flyers: hosts see own files" on storage.objects for select to authenticated
      using (bucket_id = 'flyers' and (storage.foldername(name))[1] = auth.uid()::text);
    drop policy if exists "flyers: hosts replace own files" on storage.objects;
    create policy "flyers: hosts replace own files" on storage.objects for update to authenticated
      using (bucket_id = 'flyers' and (storage.foldername(name))[1] = auth.uid()::text);
    drop policy if exists "flyers: hosts delete own files" on storage.objects;
    create policy "flyers: hosts delete own files" on storage.objects for delete to authenticated
      using (bucket_id = 'flyers' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;

-- Moona logo on shared invites: always on for free events; a Moona Pro host may switch it off per event.
-- The app only honours this while the owner's Pro is active (if Pro lapses, the logo returns automatically).
alter table public.events add column if not exists hide_branding boolean not null default false;

-- Repeating events are a Moona Pro feature (decided 22 Nov 2026).
-- Creating a series, or changing its frequency/length, needs the owner to have active Pro.
-- Trusted server code (no signed-in user, e.g. admin adding a partner's event) and admins are allowed.
-- If Pro lapses, an existing series keeps running to its last session: only new/changed series are blocked.
create or replace function public.guard_repeat_pro() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.repeat_freq is not null
     and (tg_op = 'INSERT' or new.repeat_freq is distinct from old.repeat_freq or new.repeat_count is distinct from old.repeat_count) then
    if auth.uid() is not null and not public.is_admin()
       and not exists (select 1 from public.profiles p where p.id = new.owner_id and p.pro_until > now()) then
      raise exception 'Repeating events come with Moona Pro' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists events_guard_repeat on public.events;
create trigger events_guard_repeat before insert or update on public.events for each row execute function public.guard_repeat_pro();

-- ── Pan-African cities (added 24 Nov 2026) ───────────────────────────────────
-- What's On is grouped by region and country. Lagos is live; the rest show "Coming soon"
-- (with a "Notify me" email capture) until an admin sets live = true.
alter table public.cities add column if not exists country text;
alter table public.cities add column if not exists country_code char(2);
alter table public.cities add column if not exists region text check (region in ('West Africa','East Africa','North Africa','Central Africa','Southern Africa'));
alter table public.cities add column if not exists tz text;
alter table public.cities add column if not exists currency char(3);
insert into public.cities (slug, name, live, position, country, country_code, region, tz, currency) values
  ('lagos','Lagos',true,1,'Nigeria','NG','West Africa','Africa/Lagos','NGN'),
  ('abuja','Abuja',false,2,'Nigeria','NG','West Africa','Africa/Lagos','NGN'),
  ('port-harcourt','Port Harcourt',false,3,'Nigeria','NG','West Africa','Africa/Lagos','NGN'),
  ('enugu','Enugu',false,4,'Nigeria','NG','West Africa','Africa/Lagos','NGN'),
  ('ibadan','Ibadan',false,5,'Nigeria','NG','West Africa','Africa/Lagos','NGN'),
  ('accra','Accra',false,6,'Ghana','GH','West Africa','Africa/Accra','GHS'),
  ('nairobi','Nairobi',false,7,'Kenya','KE','East Africa','Africa/Nairobi','KES'),
  ('kampala','Kampala',false,8,'Uganda','UG','East Africa','Africa/Kampala','UGX'),
  ('dar-es-salaam','Dar es Salaam',false,9,'Tanzania','TZ','East Africa','Africa/Dar_es_Salaam','TZS'),
  ('cairo','Cairo',false,10,'Egypt','EG','North Africa','Africa/Cairo','EGP')
on conflict (slug) do update set country = excluded.country, country_code = excluded.country_code, region = excluded.region,
  tz = excluded.tz, currency = excluded.currency, position = excluded.position;

-- "Notify me when Moona opens in my city" sign-ups. Written by server code only; readable by admins.
create table if not exists public.city_waitlist (
  id         uuid primary key default gen_random_uuid(),
  city       text not null references public.cities(slug),
  email      text not null check (char_length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  created_at timestamptz not null default now(),
  unique (city, email)
);
alter table public.city_waitlist enable row level security;
drop policy if exists "admins read waitlist" on public.city_waitlist;
create policy "admins read waitlist" on public.city_waitlist for select using (public.is_admin());

-- ---------- Categories: the filters on What's on (Business, Learning, Social, Family) ----------
-- Each occasion has a default category; hosts can change it on public events. Keep in step with KIND_CAT in lib/core.ts.
create or replace function public.kind_category(k text) returns text
language sql immutable set search_path = '' as $$
  select case
    when k in ('launch','committee','teammeet','retreat') then 'business'
    when k in ('webinar','workshop','training') then 'learning'
    when k in ('birthday','playdate','wedding','babyshower','naming') then 'family'
    else 'social' end
$$;
alter table public.events add column if not exists category text;
update public.events set category = public.kind_category(kind) where category is null;
create or replace function public.default_category() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.category is null then new.category := public.kind_category(new.kind); end if;
  return new;
end $$;
drop trigger if exists events_default_category on public.events;
create trigger events_default_category before insert or update of kind, category on public.events
  for each row execute function public.default_category();
alter table public.events alter column category set not null;
alter table public.events drop constraint if exists events_category_check;
alter table public.events add constraint events_category_check check (category in ('business','learning','social','family'));
create index if not exists events_category_idx on public.events (city, category, visibility, listing_status, starts_at);

-- ---------- City waitlist: record when each person was told their city opened (added 24 Nov 2026) ----------
-- Set by the admin "Email the waitlist" action so nobody is emailed twice.
alter table public.city_waitlist add column if not exists notified_at timestamptz;
create index if not exists city_waitlist_pending_idx on public.city_waitlist (city) where notified_at is null;

-- ---------- Celebrations per country (added v1.1, 24 Nov 2026) ----------
-- Moon-date overrides can apply to one country ('' = all countries), e.g. Egypt's Eid a day earlier than Nigeria's.
alter table public.celebration_dates add column if not exists country text not null default '';
alter table public.celebration_dates drop constraint if exists celebration_dates_country_check;
alter table public.celebration_dates add constraint celebration_dates_country_check check (country = '' or country ~ '^[A-Z]{2}$');
alter table public.celebration_dates drop constraint if exists celebration_dates_pkey;
alter table public.celebration_dates add primary key (celebration, country, starts_on);
-- Admin-made celebrations can be shown in chosen countries only (null = everywhere).
alter table public.custom_celebrations add column if not exists countries text[];
alter table public.custom_celebrations drop constraint if exists custom_celebrations_countries_check;
alter table public.custom_celebrations add constraint custom_celebrations_countries_check
  check (countries is null or (cardinality(countries) between 1 and 60 and array_to_string(countries, ',') ~ '^[A-Z]{2}(,[A-Z]{2})*$'));
