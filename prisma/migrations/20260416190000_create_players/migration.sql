CREATE TABLE public.players (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roster_id             UUID        NOT NULL REFERENCES public.rosters(id) ON DELETE CASCADE,
  first_name            TEXT        NOT NULL,
  last_name             TEXT        NOT NULL,
  preferred_name        TEXT,
  jersey_number         TEXT,
  date_of_birth         DATE        NOT NULL,
  bats                  TEXT,
  throws                TEXT,
  primary_positions     TEXT[]      NOT NULL DEFAULT '{}',
  secondary_positions   TEXT[]      NOT NULL DEFAULT '{}',
  is_active             BOOLEAN     NOT NULL DEFAULT true,
  parent_guardian_name  TEXT,
  parent_guardian_email TEXT,
  parent_guardian_phone TEXT,
  medical_notes         TEXT,
  uniform_size          TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: select own players"
  ON public.players FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users: insert own players"
  ON public.players FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: update own players"
  ON public.players FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: delete own players"
  ON public.players FOR DELETE USING (auth.uid() = user_id);
