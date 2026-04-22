-- ── message_reads ─────────────────────────────────────────────────────────────
-- Tracks the last time each user read each conversation so we can calculate
-- an accurate unread message count per user.

CREATE TABLE IF NOT EXISTS public.message_reads (
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('team', 'direct')),
  conversation_id   TEXT NOT NULL,
  last_read_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_type, conversation_id)
);

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own message reads"
  ON public.message_reads FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── get_unread_message_count ───────────────────────────────────────────────────
-- Returns total unread messages across all team chats and DMs for a user.

CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Unread team messages (all teams the user belongs to, excluding own messages)
    (
      SELECT COALESCE(SUM(sub.cnt), 0)::BIGINT
      FROM (
        SELECT COUNT(*) AS cnt
        FROM   team_messages tm
        WHERE  tm.team_id IN (
                 SELECT team_id FROM team_members WHERE user_id = p_user_id
               )
          AND  tm.user_id != p_user_id
          AND  tm.created_at > COALESCE(
                 (SELECT last_read_at
                  FROM   message_reads
                  WHERE  user_id           = p_user_id
                    AND  conversation_type = 'team'
                    AND  conversation_id   = tm.team_id::TEXT),
                 '1970-01-01'::TIMESTAMPTZ
               )
        GROUP BY tm.team_id
      ) sub
    )
    +
    -- Unread direct messages
    (
      SELECT COUNT(*)::BIGINT
      FROM   direct_messages dm
      WHERE  dm.recipient_id = p_user_id
        AND  dm.created_at > COALESCE(
               (SELECT last_read_at
                FROM   message_reads
                WHERE  user_id           = p_user_id
                  AND  conversation_type = 'direct'
                  AND  conversation_id   = (
                    LEAST(p_user_id::TEXT, dm.sender_id::TEXT)
                    || ':'
                    || GREATEST(p_user_id::TEXT, dm.sender_id::TEXT)
                  )),
               '1970-01-01'::TIMESTAMPTZ
             )
    )
  )::INTEGER
$$;

-- ── Enable Realtime for message tables ────────────────────────────────────────
-- Required for postgres_changes subscriptions on these tables.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE  pubname    = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename  = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE  pubname    = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename  = 'team_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
  END IF;
END $$;
