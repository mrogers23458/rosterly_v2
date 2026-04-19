-- Change events.team_id FK from ON DELETE SET NULL → ON DELETE CASCADE
-- so that deleting a team automatically removes all its associated events.

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_team_id_fkey;

ALTER TABLE public.events
  ADD CONSTRAINT events_team_id_fkey
    FOREIGN KEY (team_id)
    REFERENCES public.teams(id)
    ON DELETE CASCADE;
