-- Team chat messages
CREATE TABLE public.team_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  sender_name TEXT        NOT NULL DEFAULT '',
  body        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_messages_body_not_empty   CHECK (char_length(trim(body)) > 0),
  CONSTRAINT team_messages_body_max_length  CHECK (char_length(body) <= 2000)
);

-- Index for efficient per-team message fetching in chronological order
CREATE INDEX team_messages_team_created_idx
  ON public.team_messages (team_id, created_at ASC);

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Team members can read their team's messages
CREATE POLICY "team_members: select team_messages"
  ON public.team_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_messages.team_id
        AND tm.user_id = auth.uid()
    )
  );

-- Team members can post messages (must be the sender)
CREATE POLICY "team_members: insert team_messages"
  ON public.team_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_messages.team_id
        AND tm.user_id = auth.uid()
    )
  );

-- Users can delete only their own messages
CREATE POLICY "users: delete own team_messages"
  ON public.team_messages FOR DELETE
  USING (auth.uid() = user_id);
