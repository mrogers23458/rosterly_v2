-- ──────────────────────────────────────────────────────────────────────────────
-- 1.  User profiles
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name  text,
  phone      text,
  address    text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and write their own profile row.
CREATE POLICY "profiles_self_all"
  ON public.profiles FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK(auth.uid() = user_id);

-- Any authenticated user can read profiles (names/avatars shown in team contexts).
CREATE POLICY "profiles_auth_read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2.  claimed_by_user_id on players
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS claimed_by_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_players_claimed_by ON public.players(claimed_by_user_id);

-- Allow the claiming user to edit the player record they claimed.
CREATE POLICY "players_claimer_update"
  ON public.players FOR UPDATE
  USING     (claimed_by_user_id = auth.uid())
  WITH CHECK(claimed_by_user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────────
-- 3.  Player claims (request + approval workflow)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.player_claims (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  uuid        NOT NULL REFERENCES public.players(id)  ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  team_id    uuid        NOT NULL REFERENCES public.teams(id)     ON DELETE CASCADE,
  status     text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected')),
  message    text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (player_id, user_id)
);

ALTER TABLE public.player_claims ENABLE ROW LEVEL SECURITY;

-- Claimant can insert and view their own claims.
CREATE POLICY "claims_self_all"
  ON public.player_claims FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK(auth.uid() = user_id);

-- Team owners and managers can view and update all claims for their team.
CREATE POLICY "claims_manager_all"
  ON public.player_claims FOR ALL
  USING     (public.has_team_role(team_id, 'manager'));

-- ──────────────────────────────────────────────────────────────────────────────
-- 4.  Avatars storage bucket
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users may upload into their own folder (avatars/<user_id>/...).
CREATE POLICY "avatars_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone (including anonymous) can read public avatar URLs.
CREATE POLICY "avatars_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
