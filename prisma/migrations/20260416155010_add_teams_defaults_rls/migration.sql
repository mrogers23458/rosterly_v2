-- Fix updated_at: add database-level default so Supabase client inserts work
ALTER TABLE "teams"
  ALTER COLUMN "updated_at" SET DEFAULT now();

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Foreign key: user_id -> auth.users (cascade delete when user is removed)
ALTER TABLE "teams"
  ADD CONSTRAINT "teams_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES auth.users(id) ON DELETE CASCADE;

-- Row-level security: users can only see and modify their own teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: select own teams"
  ON public.teams FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users: insert own teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: update own teams"
  ON public.teams FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users: delete own teams"
  ON public.teams FOR DELETE
  USING (auth.uid() = user_id);
