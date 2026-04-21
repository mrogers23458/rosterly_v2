-- RSVP deadline support on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS rsvp_deadline_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS events_rsvp_deadline_idx
  ON public.events (rsvp_deadline_at)
  WHERE rsvp_deadline_at IS NOT NULL;

-- Extend reminder model for final RSVP follow-ups and extra channels.
ALTER TABLE public.event_reminders
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'event_reminder',
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'all_members';

ALTER TABLE public.event_reminders
  DROP CONSTRAINT IF EXISTS event_reminders_kind_check,
  ADD CONSTRAINT event_reminders_kind_check
    CHECK (kind IN ('event_reminder', 'rsvp_follow_up'));

ALTER TABLE public.event_reminders
  DROP CONSTRAINT IF EXISTS event_reminders_audience_check,
  ADD CONSTRAINT event_reminders_audience_check
    CHECK (audience IN ('all_members', 'non_responders'));

ALTER TABLE public.event_reminders
  DROP CONSTRAINT IF EXISTS event_reminders_channel_check,
  ADD CONSTRAINT event_reminders_channel_check
    CHECK (channel IN ('email', 'sms', 'in_app', 'push', 'team_chat'));

ALTER TABLE public.event_reminders
  DROP CONSTRAINT IF EXISTS event_reminders_minutes_before_check,
  ADD CONSTRAINT event_reminders_minutes_before_check
    CHECK (minutes_before >= 0);

CREATE INDEX IF NOT EXISTS event_reminders_kind_idx
  ON public.event_reminders (kind, audience);

-- Better observability and retry metadata in reminder logs.
ALTER TABLE public.event_reminder_logs
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;

-- Web push subscriptions for PWA push reminders.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_active_idx
  ON public.push_subscriptions (user_id, active);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Replace due-reminder resolver to support RSVP follow-up reminders and
-- idempotent fire-at dedupe keys.
DROP FUNCTION IF EXISTS public.get_due_reminders();

CREATE OR REPLACE FUNCTION public.get_due_reminders()
RETURNS TABLE (
  reminder_id UUID,
  kind TEXT,
  audience TEXT,
  channel TEXT,
  minutes_before INT,
  event_id UUID,
  event_title TEXT,
  event_date DATE,
  start_time TEXT,
  team_id UUID,
  event_owner_id UUID,
  location TEXT,
  opponent TEXT,
  event_type TEXT,
  fire_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH reminder_base AS (
    SELECT
      er.id AS reminder_id,
      er.kind,
      er.audience,
      er.channel,
      er.minutes_before,
      er.event_id,
      e.title AS event_title,
      e.event_date,
      e.start_time,
      e.team_id,
      e.user_id AS event_owner_id,
      e.location,
      e.opponent,
      e.type AS event_type,
      CASE
        WHEN er.kind = 'rsvp_follow_up' THEN e.rsvp_deadline_at
        ELSE (
          to_timestamp(
            e.event_date::text || ' ' || COALESCE(e.start_time, '09:00'),
            'YYYY-MM-DD HH24:MI'
          ) - (er.minutes_before * INTERVAL '1 minute')
        )
      END AS fire_at
    FROM public.event_reminders er
    JOIN public.events e ON e.id = er.event_id
    WHERE e.is_archived = false
      AND (
        er.kind <> 'rsvp_follow_up'
        OR e.rsvp_deadline_at IS NOT NULL
      )
  )
  SELECT rb.*
  FROM reminder_base rb
  WHERE
    rb.fire_at <= NOW()
    AND rb.fire_at > NOW() - INTERVAL '24 hours'
    AND NOT EXISTS (
      SELECT 1
      FROM public.event_reminder_logs erl
      WHERE erl.reminder_id = rb.reminder_id
        AND erl.scheduled_for = rb.fire_at
        AND erl.status IN ('sent', 'pending')
    );
$$;
