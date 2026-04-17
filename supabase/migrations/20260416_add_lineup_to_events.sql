-- Add lineup association to events.
-- Run in Supabase SQL editor after the events table migration.

alter table public.events
  add column if not exists lineup_id uuid references public.game_lineups(id) on delete set null;

create index if not exists events_lineup_id_idx on public.events(lineup_id);
