-- Player game-by-game stats.
-- Each row represents one player's performance in a single game.
-- lineup_id links to the game lineup used for that game (nullable for imported stats).
-- source distinguishes manual entry from future import pipelines (e.g. 'gamechanger').

CREATE TABLE public.player_game_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id       UUID        NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  lineup_id       UUID        REFERENCES public.game_lineups(id) ON DELETE SET NULL,
  source          TEXT        NOT NULL DEFAULT 'manual',
  game_date       DATE,
  opponent        TEXT,

  -- Batting
  at_bats         INT         NOT NULL DEFAULT 0,
  hits            INT         NOT NULL DEFAULT 0,
  doubles         INT         NOT NULL DEFAULT 0,
  triples         INT         NOT NULL DEFAULT 0,
  home_runs       INT         NOT NULL DEFAULT 0,
  rbi             INT         NOT NULL DEFAULT 0,
  walks           INT         NOT NULL DEFAULT 0,
  strikeouts_bat  INT         NOT NULL DEFAULT 0,
  stolen_bases    INT         NOT NULL DEFAULT 0,
  runs            INT         NOT NULL DEFAULT 0,
  hit_by_pitch    INT         NOT NULL DEFAULT 0,

  -- Pitching
  innings_pitched NUMERIC(4,1) NOT NULL DEFAULT 0,
  hits_allowed    INT         NOT NULL DEFAULT 0,
  runs_allowed    INT         NOT NULL DEFAULT 0,
  earned_runs     INT         NOT NULL DEFAULT 0,
  walks_allowed   INT         NOT NULL DEFAULT 0,
  strikeouts_pit  INT         NOT NULL DEFAULT 0,
  wild_pitches    INT         NOT NULL DEFAULT 0,
  hit_batters     INT         NOT NULL DEFAULT 0,

  -- Fielding
  putouts         INT         NOT NULL DEFAULT 0,
  assists         INT         NOT NULL DEFAULT 0,
  errors          INT         NOT NULL DEFAULT 0,

  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER player_game_stats_updated_at
  BEFORE UPDATE ON public.player_game_stats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.player_game_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: select own player_game_stats"
  ON public.player_game_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users: insert own player_game_stats"
  ON public.player_game_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: update own player_game_stats"
  ON public.player_game_stats FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: delete own player_game_stats"
  ON public.player_game_stats FOR DELETE
  USING (auth.uid() = user_id);
