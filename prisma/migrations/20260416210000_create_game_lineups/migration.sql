-- Game Lineups: one record per game lineup, tied to a team and optionally a roster
CREATE TABLE public.game_lineups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id     UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  roster_id   UUID        REFERENCES public.rosters(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL,
  game_date   DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER game_lineups_updated_at
  BEFORE UPDATE ON public.game_lineups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.game_lineups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: select own game_lineups"
  ON public.game_lineups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users: insert own game_lineups"
  ON public.game_lineups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users: update own game_lineups"
  ON public.game_lineups FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users: delete own game_lineups"
  ON public.game_lineups FOR DELETE USING (auth.uid() = user_id);

-- Lineup Entries: per-inning position assignments for each player slot
CREATE TABLE public.lineup_entries (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  lineup_id     UUID  NOT NULL REFERENCES public.game_lineups(id) ON DELETE CASCADE,
  batting_order INT   NOT NULL,
  jersey_number TEXT,
  player_name   TEXT  NOT NULL,
  inn_1         TEXT  NOT NULL DEFAULT 'Bench',
  inn_2         TEXT  NOT NULL DEFAULT 'Bench',
  inn_3         TEXT  NOT NULL DEFAULT 'Bench',
  inn_4         TEXT  NOT NULL DEFAULT 'Bench',
  inn_5         TEXT  NOT NULL DEFAULT 'Bench',
  inn_6         TEXT  NOT NULL DEFAULT 'Bench'
);

ALTER TABLE public.lineup_entries ENABLE ROW LEVEL SECURITY;

-- Security is enforced via the parent game_lineups row
CREATE POLICY "users: select own lineup_entries"
  ON public.lineup_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.game_lineups gl
    WHERE gl.id = lineup_entries.lineup_id AND gl.user_id = auth.uid()
  ));

CREATE POLICY "users: insert own lineup_entries"
  ON public.lineup_entries FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.game_lineups gl
    WHERE gl.id = lineup_entries.lineup_id AND gl.user_id = auth.uid()
  ));

CREATE POLICY "users: update own lineup_entries"
  ON public.lineup_entries FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.game_lineups gl
    WHERE gl.id = lineup_entries.lineup_id AND gl.user_id = auth.uid()
  ));

CREATE POLICY "users: delete own lineup_entries"
  ON public.lineup_entries FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.game_lineups gl
    WHERE gl.id = lineup_entries.lineup_id AND gl.user_id = auth.uid()
  ));
