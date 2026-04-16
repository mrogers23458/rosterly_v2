-- Run this in the Supabase SQL editor (Dashboard → SQL editor → New query).
-- Creates the teams table with RLS so users can only access their own teams.

create table if not exists public.teams (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  name         text        not null,
  season       text        not null,
  division     text        not null,
  age_group    text        not null,
  team_type    text        not null,
  organization text,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Keep updated_at current automatically
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger teams_updated_at
  before update on public.teams
  for each row execute function public.handle_updated_at();

-- Row-level security — users see and modify only their own rows
alter table public.teams enable row level security;

create policy "users: select own teams"
  on public.teams for select
  using (auth.uid() = user_id);

create policy "users: insert own teams"
  on public.teams for insert
  with check (auth.uid() = user_id);

create policy "users: update own teams"
  on public.teams for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users: delete own teams"
  on public.teams for delete
  using (auth.uid() = user_id);
