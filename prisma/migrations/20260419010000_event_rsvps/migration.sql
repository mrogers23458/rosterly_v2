-- ── Event RSVPs ──────────────────────────────────────────────────────────────
-- Allows team members and event participants to self-report whether they are
-- attending an event.  Separate from event_availability which is coach-managed
-- per-player; this table is user-managed and represents a personal response.

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  status          TEXT        NOT NULL
                              CHECK (status IN ('going', 'not_going', 'maybe')),
  responder_name  TEXT,       -- captured from auth metadata at RSVP time
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_rsvps_event_id_idx ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS event_rsvps_user_id_idx  ON public.event_rsvps(user_id);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Users can fully manage their own RSVP.
CREATE POLICY "users can manage own rsvp"
  ON public.event_rsvps FOR ALL
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Team members can read all RSVPs for their team's events.
-- Event owners can read all RSVPs for their events.
CREATE POLICY "team members and owners can read rsvps"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      LEFT JOIN public.team_members tm
        ON tm.team_id = e.team_id AND tm.user_id = auth.uid()
      WHERE e.id = event_id
        AND (e.user_id = auth.uid() OR tm.user_id IS NOT NULL)
    )
  );

-- Updated-at trigger (reuse existing function)
CREATE TRIGGER event_rsvps_updated_at
  BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
