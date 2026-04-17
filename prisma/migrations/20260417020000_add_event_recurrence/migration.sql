-- Add recurring event support to the events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recurrence_type      TEXT
    CHECK (recurrence_type IN ('daily', 'weekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_end_date  DATE,
  ADD COLUMN IF NOT EXISTS recurrence_group_id  UUID;

CREATE INDEX IF NOT EXISTS events_recurrence_group_idx
  ON public.events(recurrence_group_id)
  WHERE recurrence_group_id IS NOT NULL;
