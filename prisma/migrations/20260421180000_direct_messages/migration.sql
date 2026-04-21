-- Direct messages between teammates (must share at least one team)
CREATE TABLE public.direct_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name  TEXT        NOT NULL DEFAULT '',
  body         TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT direct_messages_body_not_empty  CHECK (char_length(trim(body)) > 0),
  CONSTRAINT direct_messages_body_max_length CHECK (char_length(body) <= 2000),
  CONSTRAINT direct_messages_not_self        CHECK (sender_id <> recipient_id)
);

CREATE INDEX direct_messages_conversation_created_idx
  ON public.direct_messages (sender_id, recipient_id, created_at ASC);

CREATE INDEX direct_messages_conversation_rev_created_idx
  ON public.direct_messages (recipient_id, sender_id, created_at ASC);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Participants can read their conversation rows
CREATE POLICY "dm: select if participant"
  ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Sender must be current user and must share a team with recipient
CREATE POLICY "dm: insert if teammate"
  ON public.direct_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.team_members tm_self
      JOIN public.team_members tm_peer
        ON tm_self.team_id = tm_peer.team_id
      WHERE tm_self.user_id = auth.uid()
        AND tm_peer.user_id = recipient_id
    )
  );

CREATE POLICY "dm: delete own"
  ON public.direct_messages FOR DELETE
  USING (auth.uid() = sender_id);
