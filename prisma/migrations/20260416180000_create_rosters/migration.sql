CREATE TABLE public.rosters (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id    UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  season     TEXT        NOT NULL,
  year       TEXT        NOT NULL DEFAULT '',
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reuse the existing handle_updated_at trigger function
CREATE TRIGGER rosters_updated_at
  BEFORE UPDATE ON public.rosters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: select own rosters"
  ON public.rosters FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users: insert own rosters"
  ON public.rosters FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: update own rosters"
  ON public.rosters FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: delete own rosters"
  ON public.rosters FOR DELETE USING (auth.uid() = user_id);
