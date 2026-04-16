-- Allow rosters to exist without belonging to a team (team_id becomes optional).
-- Change the FK to SET NULL on team deletion so rosters are not cascade-deleted
-- when their associated team is removed.

ALTER TABLE public.rosters ALTER COLUMN team_id DROP NOT NULL;

-- Drop the old CASCADE foreign key and re-create it with SET NULL behaviour.
ALTER TABLE public.rosters DROP CONSTRAINT IF EXISTS "rosters_team_id_fkey";

ALTER TABLE public.rosters
  ADD CONSTRAINT "rosters_team_id_fkey"
  FOREIGN KEY (team_id)
  REFERENCES public.teams(id)
  ON DELETE SET NULL;
