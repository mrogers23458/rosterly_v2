-- ── Event Reminder System ─────────────────────────────────────────────────────

-- ── 1. Reminder configurations ───────────────────────────────────────────────
-- Stores which channels and how many minutes before each event a reminder fires.

CREATE TABLE IF NOT EXISTS public.event_reminders (
  id             UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID  NOT NULL REFERENCES public.events(id)  ON DELETE CASCADE,
  user_id        UUID  NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  channel        TEXT  NOT NULL CHECK (channel IN ('email', 'sms', 'in_app')),
  minutes_before INT   NOT NULL CHECK (minutes_before > 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, channel, minutes_before)
);

CREATE INDEX IF NOT EXISTS event_reminders_event_id_idx ON public.event_reminders(event_id);

ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

-- Event owner + team managers can manage reminders.
CREATE POLICY "coaches can manage event reminders"
  ON public.event_reminders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      LEFT JOIN public.team_members tm
        ON tm.team_id = e.team_id AND tm.user_id = auth.uid()
      WHERE e.id = event_id
        AND (
          e.user_id = auth.uid()
          OR (tm.user_id IS NOT NULL AND tm.role IN ('owner','manager','assistant_coach'))
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
          OR (tm.user_id IS NOT NULL AND tm.role IN ('owner','manager','assistant_coach'))
        )
    )
  );

-- ── 2. Reminder send log ─────────────────────────────────────────────────────
-- Tracks which reminders have been processed so we never double-send.

CREATE TABLE IF NOT EXISTS public.event_reminder_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id    UUID        NOT NULL REFERENCES public.event_reminders(id) ON DELETE CASCADE,
  scheduled_for  TIMESTAMPTZ NOT NULL,
  sent_at        TIMESTAMPTZ,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','sent','failed')),
  recipient_count INT,
  error_msg      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reminder_id, scheduled_for)
);

CREATE INDEX IF NOT EXISTS event_reminder_logs_reminder_id_idx ON public.event_reminder_logs(reminder_id);
CREATE INDEX IF NOT EXISTS event_reminder_logs_status_idx      ON public.event_reminder_logs(status);

ALTER TABLE public.event_reminder_logs ENABLE ROW LEVEL SECURITY;

-- Only the service role (cron job) writes logs; coaches can read.
CREATE POLICY "coaches can read reminder logs"
  ON public.event_reminder_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_reminders er
      JOIN  public.events e ON e.id = er.event_id
      LEFT JOIN public.team_members tm
        ON tm.team_id = e.team_id AND tm.user_id = auth.uid()
      WHERE er.id = reminder_id
        AND (e.user_id = auth.uid() OR tm.user_id IS NOT NULL)
    )
  );

-- ── 3. In-app notifications ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id   UUID        REFERENCES public.events(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  body       TEXT,
  link       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx  ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_at_idx  ON public.notifications(read_at) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 4. Helper function: get_due_reminders ────────────────────────────────────
-- Called by the cron endpoint to find reminders whose fire time has passed
-- but haven't been processed yet.

CREATE OR REPLACE FUNCTION public.get_due_reminders()
RETURNS TABLE (
  reminder_id     UUID,
  channel         TEXT,
  minutes_before  INT,
  event_id        UUID,
  event_title     TEXT,
  event_date      DATE,
  start_time      TEXT,
  team_id         UUID,
  event_owner_id  UUID,
  location        TEXT,
  opponent        TEXT,
  event_type      TEXT,
  fire_at         TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    er.id                                                            AS reminder_id,
    er.channel,
    er.minutes_before,
    er.event_id,
    e.title                                                          AS event_title,
    e.event_date,
    e.start_time,
    e.team_id,
    e.user_id                                                        AS event_owner_id,
    e.location,
    e.opponent,
    e.type                                                           AS event_type,
    (
      to_timestamp(
        e.event_date::text || ' ' || COALESCE(e.start_time, '09:00'),
        'YYYY-MM-DD HH24:MI'
      ) - (er.minutes_before * INTERVAL '1 minute')
    )                                                                AS fire_at
  FROM public.event_reminders er
  JOIN public.events e ON e.id = er.event_id
  WHERE
    e.is_archived = false
    -- Fire time has already passed
    AND to_timestamp(
          e.event_date::text || ' ' || COALESCE(e.start_time, '09:00'),
          'YYYY-MM-DD HH24:MI'
        ) - (er.minutes_before * INTERVAL '1 minute')
        <= NOW()
    -- But not more than 24 h ago (don't send very stale reminders)
    AND to_timestamp(
          e.event_date::text || ' ' || COALESCE(e.start_time, '09:00'),
          'YYYY-MM-DD HH24:MI'
        ) - (er.minutes_before * INTERVAL '1 minute')
        > NOW() - INTERVAL '24 hours'
    -- Not yet processed
    AND NOT EXISTS (
      SELECT 1 FROM public.event_reminder_logs erl
      WHERE erl.reminder_id = er.id
        AND erl.status IN ('sent','pending')
    );
$$;
