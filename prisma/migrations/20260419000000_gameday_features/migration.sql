-- ── Gameday features migration ──────────────────────────────────────────────
-- 1. Per-event player availability tracking
-- 2. Share token for public lineup sharing
-- Both are backward-compatible additions; nothing is dropped or altered.

-- ── 1. event_availability ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_availability (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID        NOT NULL REFERENCES public.events(id)   ON DELETE CASCADE,
  player_id  UUID        NOT NULL REFERENCES public.players(id)  ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  status     TEXT        NOT NULL DEFAULT 'unknown'
                         CHECK (status IN ('available', 'unavailable', 'unknown')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, player_id)
);

CREATE INDEX IF NOT EXISTS event_availability_event_id_idx  ON public.event_availability(event_id);
CREATE INDEX IF NOT EXISTS event_availability_player_id_idx ON public.event_availability(player_id);

ALTER TABLE public.event_availability ENABLE ROW LEVEL SECURITY;

-- Team managers and event owners can read/write all availability for their events.
-- Viewers and players on the team can read availability.
CREATE POLICY "coaches can manage event availability"
  ON public.event_availability FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      LEFT JOIN public.team_members tm
        ON tm.team_id = e.team_id AND tm.user_id = auth.uid()
      WHERE e.id = event_id
        AND (
          e.user_id = auth.uid()
          OR (tm.user_id IS NOT NULL AND tm.role IN ('owner', 'manager', 'assistant_coach'))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      LEFT JOIN public.team_members tm
        ON tm.team_id = e.team_id AND tm.user_id = auth.uid()
      WHERE e.id = event_id
        AND (
          e.user_id = auth.uid()
          OR (tm.user_id IS NOT NULL AND tm.role IN ('owner', 'manager', 'assistant_coach'))
        )
    )
  );

-- Viewers can see availability for events on their teams.
CREATE POLICY "viewers can read event availability"
  ON public.event_availability FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.team_members tm ON tm.team_id = e.team_id
      WHERE e.id = event_id AND tm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );

-- Updated-at trigger
CREATE TRIGGER event_availability_updated_at
  BEFORE UPDATE ON public.event_availability
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 2. Share token on game_lineups ───────────────────────────────────────────

ALTER TABLE public.game_lineups
  ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS game_lineups_share_token_idx
  ON public.game_lineups(share_token)
  WHERE share_token IS NOT NULL;
