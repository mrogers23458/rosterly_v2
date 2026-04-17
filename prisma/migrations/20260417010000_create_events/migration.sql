-- Events: games, practices, scrimmages, fundraisers, etc.
CREATE TABLE IF NOT EXISTS public.events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id     UUID        REFERENCES public.teams(id)   ON DELETE SET NULL,
  roster_id   UUID        REFERENCES public.rosters(id) ON DELETE SET NULL,
  lineup_id   UUID        REFERENCES public.game_lineups(id) ON DELETE SET NULL,

  type        TEXT        NOT NULL DEFAULT 'game'
                          CHECK (type IN ('game','practice','scrimmage','fundraiser','other')),
  title       TEXT        NOT NULL,
  opponent    TEXT,
  event_date  DATE        NOT NULL,
  start_time  TEXT,
  end_time    TEXT,
  location    TEXT,
  notes       TEXT,
  is_home     BOOLEAN     NOT NULL DEFAULT true,
  is_archived BOOLEAN     NOT NULL DEFAULT false,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage their own events"
  ON public.events FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS events_user_id_idx     ON public.events(user_id);
CREATE INDEX IF NOT EXISTS events_team_id_idx     ON public.events(team_id);
CREATE INDEX IF NOT EXISTS events_event_date_idx  ON public.events(event_date);
CREATE INDEX IF NOT EXISTS events_is_archived_idx ON public.events(is_archived);
CREATE INDEX IF NOT EXISTS events_lineup_id_idx   ON public.events(lineup_id);
