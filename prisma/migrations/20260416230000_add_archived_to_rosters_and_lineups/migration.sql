ALTER TABLE public.rosters      ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.game_lineups ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;
