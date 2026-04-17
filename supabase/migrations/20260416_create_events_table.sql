-- Run this in the Supabase SQL editor (Dashboard → SQL editor → New query).
-- Creates the events table with RLS so users can only access their own events.

create table if not exists public.events (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  team_id     uuid        references public.teams(id) on delete set null,
  roster_id   uuid        references public.rosters(id) on delete set null,

  type        text        not null default 'game'
                          check (type in ('game','practice','scrimmage','fundraiser','other')),
  title       text        not null,
  opponent    text,
  event_date  date        not null,
  start_time  text,                    -- stored as "HH:MM" (24-h)
  end_time    text,
  location    text,
  notes       text,
  is_home     boolean     not null default true,
  is_archived boolean     not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Re-use the handle_updated_at trigger function (already created by the teams migration).
-- Only create it if it doesn't exist yet (idempotent guard).
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_updated_at
  before update on public.events
  for each row execute function public.handle_updated_at();

-- Row-level security: users see only their own events.
alter table public.events enable row level security;

create policy "users can manage their own events"
  on public.events
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Helpful indexes
create index if not exists events_user_id_idx        on public.events(user_id);
create index if not exists events_team_id_idx        on public.events(team_id);
create index if not exists events_event_date_idx     on public.events(event_date);
create index if not exists events_is_archived_idx    on public.events(is_archived);
