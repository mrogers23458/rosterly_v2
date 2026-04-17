-- ============================================================
-- Team-scoped roles and permissions (MVP)
-- Roles: owner | manager | assistant_coach | viewer
-- ============================================================

-- ── 1. team_members table ─────────────────────────────────────────────────────

CREATE TABLE public.team_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID        NOT NULL REFERENCES public.teams(id)   ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  role        TEXT        NOT NULL
                          CHECK (role IN ('owner','manager','assistant_coach','viewer')),
  invited_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX team_members_team_id_idx ON public.team_members(team_id);
CREATE INDEX team_members_user_id_idx ON public.team_members(user_id);

-- ── 2. Seed existing team owners ─────────────────────────────────────────────

INSERT INTO public.team_members (team_id, user_id, role)
SELECT id, user_id, 'owner'
FROM   public.teams
ON CONFLICT (team_id, user_id) DO NOTHING;

-- ── 3. SECURITY DEFINER helper functions ─────────────────────────────────────
-- Using SECURITY DEFINER avoids RLS recursion when team_members policies
-- need to query team_members itself.

-- Returns true if the current auth user is a member of (or owner of) the team.
CREATE OR REPLACE FUNCTION public.is_team_member_of(p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM teams          WHERE id      = p_team_id AND user_id = auth.uid());
$$;

-- Returns true if the current auth user has at least the given role on the team.
-- Role hierarchy: owner(4) > manager(3) > assistant_coach(2) > viewer(1)
CREATE OR REPLACE FUNCTION public.has_team_role(p_team_id uuid, p_min_role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT
       CASE p_min_role
         WHEN 'viewer'          THEN true
         WHEN 'assistant_coach' THEN role IN ('owner','manager','assistant_coach')
         WHEN 'manager'         THEN role IN ('owner','manager')
         WHEN 'owner'           THEN role = 'owner'
         ELSE false
       END
     FROM team_members
     WHERE team_id = p_team_id AND user_id = auth.uid()),
    -- Fallback: the row owner (teams.user_id) is always treated as owner
    EXISTS (SELECT 1 FROM teams WHERE id = p_team_id AND user_id = auth.uid())
  );
$$;

-- Looks up a Supabase auth user by email (used for invite-by-email flow).
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = auth, public AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;

-- ── 4. RLS on team_members ────────────────────────────────────────────────────

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Any team member (or team owner) can see the roster of members for their teams.
CREATE POLICY "team_members: select for team members"
  ON public.team_members FOR SELECT
  USING (is_team_member_of(team_members.team_id));

-- Only the team owner (teams.user_id) or an existing manager can add new members.
CREATE POLICY "team_members: insert by owner or manager"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM teams WHERE id = team_members.team_id AND user_id = auth.uid())
    OR (
      -- Managers can add members but cannot grant the 'owner' role
      team_members.role != 'owner'
      AND EXISTS (
        SELECT 1 FROM team_members tm2
        WHERE tm2.team_id = team_members.team_id
          AND tm2.user_id = auth.uid()
          AND tm2.role    = 'manager'
      )
    )
  );

-- Only team owner can change roles.
CREATE POLICY "team_members: update by team owner"
  ON public.team_members FOR UPDATE
  USING  (EXISTS (SELECT 1 FROM teams WHERE id = team_members.team_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM teams WHERE id = team_members.team_id AND user_id = auth.uid()));

-- Owner can remove anyone; members can remove themselves.
CREATE POLICY "team_members: delete by owner or self"
  ON public.team_members FOR DELETE
  USING (
    auth.uid() = team_members.user_id
    OR EXISTS (SELECT 1 FROM teams WHERE id = team_members.team_id AND user_id = auth.uid())
  );

-- ── 5. Update RLS on teams ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "users: select own teams" ON public.teams;
DROP POLICY IF EXISTS "users: insert own teams" ON public.teams;
DROP POLICY IF EXISTS "users: update own teams" ON public.teams;
DROP POLICY IF EXISTS "users: delete own teams" ON public.teams;

-- Any team member can view the team.
CREATE POLICY "teams: select for members"
  ON public.teams FOR SELECT
  USING (auth.uid() = user_id OR is_team_member_of(teams.id));

-- Only authenticated users inserting their own rows.
CREATE POLICY "teams: insert by authenticated"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owner or manager can edit team settings.
CREATE POLICY "teams: update by owner or manager"
  ON public.teams FOR UPDATE
  USING  (has_team_role(teams.id, 'manager'))
  WITH CHECK (has_team_role(teams.id, 'manager'));

-- Only team owner can delete.
CREATE POLICY "teams: delete by owner"
  ON public.teams FOR DELETE
  USING (auth.uid() = user_id);

-- ── 6. Update RLS on rosters ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "users: select own rosters" ON public.rosters;
DROP POLICY IF EXISTS "users: insert own rosters" ON public.rosters;
DROP POLICY IF EXISTS "users: update own rosters" ON public.rosters;
DROP POLICY IF EXISTS "users: delete own rosters" ON public.rosters;

CREATE POLICY "rosters: select for team members"
  ON public.rosters FOR SELECT
  USING (
    auth.uid() = user_id
    OR (team_id IS NOT NULL AND is_team_member_of(team_id))
  );

CREATE POLICY "rosters: write by owner or manager"
  ON public.rosters FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (team_id IS NULL OR has_team_role(team_id, 'manager'))
  );

CREATE POLICY "rosters: update by owner or manager"
  ON public.rosters FOR UPDATE
  USING  (auth.uid() = user_id OR (team_id IS NOT NULL AND has_team_role(team_id, 'manager')))
  WITH CHECK (auth.uid() = user_id OR (team_id IS NOT NULL AND has_team_role(team_id, 'manager')));

CREATE POLICY "rosters: delete by owner or manager"
  ON public.rosters FOR DELETE
  USING (auth.uid() = user_id OR (team_id IS NOT NULL AND has_team_role(team_id, 'manager')));

-- ── 7. Update RLS on players ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "users: select own players" ON public.players;
DROP POLICY IF EXISTS "users: insert own players" ON public.players;
DROP POLICY IF EXISTS "users: update own players" ON public.players;
DROP POLICY IF EXISTS "users: delete own players" ON public.players;

CREATE POLICY "players: select for team members"
  ON public.players FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM rosters r
      WHERE r.id = players.roster_id
        AND r.team_id IS NOT NULL
        AND is_team_member_of(r.team_id)
    )
  );

CREATE POLICY "players: write by owner or manager"
  ON public.players FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (SELECT 1 FROM rosters WHERE id = players.roster_id AND user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM rosters r
        WHERE r.id = players.roster_id
          AND r.team_id IS NOT NULL
          AND has_team_role(r.team_id, 'manager')
      )
    )
  );

CREATE POLICY "players: update by owner or manager"
  ON public.players FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM rosters r
      WHERE r.id = players.roster_id
        AND r.team_id IS NOT NULL
        AND has_team_role(r.team_id, 'manager')
    )
  );

CREATE POLICY "players: delete by owner or manager"
  ON public.players FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM rosters r
      WHERE r.id = players.roster_id
        AND r.team_id IS NOT NULL
        AND has_team_role(r.team_id, 'manager')
    )
  );

-- ── 8. Update RLS on game_lineups ─────────────────────────────────────────────

DROP POLICY IF EXISTS "users: select own game_lineups" ON public.game_lineups;
DROP POLICY IF EXISTS "users: insert own game_lineups" ON public.game_lineups;
DROP POLICY IF EXISTS "users: update own game_lineups" ON public.game_lineups;
DROP POLICY IF EXISTS "users: delete own game_lineups" ON public.game_lineups;

CREATE POLICY "game_lineups: select for team members"
  ON public.game_lineups FOR SELECT
  USING (
    auth.uid() = user_id
    OR (team_id IS NOT NULL AND is_team_member_of(team_id))
  );

-- Owner, manager, or assistant_coach can create/edit/delete lineups.
CREATE POLICY "game_lineups: write by assistant_coach+"
  ON public.game_lineups FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (team_id IS NULL OR has_team_role(team_id, 'assistant_coach'))
  );

CREATE POLICY "game_lineups: update by assistant_coach+"
  ON public.game_lineups FOR UPDATE
  USING  (auth.uid() = user_id OR (team_id IS NOT NULL AND has_team_role(team_id, 'assistant_coach')))
  WITH CHECK (auth.uid() = user_id OR (team_id IS NOT NULL AND has_team_role(team_id, 'assistant_coach')));

CREATE POLICY "game_lineups: delete by assistant_coach+"
  ON public.game_lineups FOR DELETE
  USING (auth.uid() = user_id OR (team_id IS NOT NULL AND has_team_role(team_id, 'assistant_coach')));

-- ── 9. Update RLS on lineup_entries ──────────────────────────────────────────

DROP POLICY IF EXISTS "users: select own lineup_entries" ON public.lineup_entries;
DROP POLICY IF EXISTS "users: insert own lineup_entries" ON public.lineup_entries;
DROP POLICY IF EXISTS "users: update own lineup_entries" ON public.lineup_entries;
DROP POLICY IF EXISTS "users: delete own lineup_entries" ON public.lineup_entries;

-- Access flows through the parent game_lineup's team membership.
CREATE POLICY "lineup_entries: select via lineup"
  ON public.lineup_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_lineups gl
      WHERE gl.id = lineup_entries.lineup_id
        AND (gl.user_id = auth.uid() OR (gl.team_id IS NOT NULL AND is_team_member_of(gl.team_id)))
    )
  );

CREATE POLICY "lineup_entries: write via lineup (assistant_coach+)"
  ON public.lineup_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_lineups gl
      WHERE gl.id = lineup_entries.lineup_id
        AND (
          gl.user_id = auth.uid()
          OR (gl.team_id IS NOT NULL AND has_team_role(gl.team_id, 'assistant_coach'))
        )
    )
  );

CREATE POLICY "lineup_entries: update via lineup (assistant_coach+)"
  ON public.lineup_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM game_lineups gl
      WHERE gl.id = lineup_entries.lineup_id
        AND (
          gl.user_id = auth.uid()
          OR (gl.team_id IS NOT NULL AND has_team_role(gl.team_id, 'assistant_coach'))
        )
    )
  );

CREATE POLICY "lineup_entries: delete via lineup (assistant_coach+)"
  ON public.lineup_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM game_lineups gl
      WHERE gl.id = lineup_entries.lineup_id
        AND (
          gl.user_id = auth.uid()
          OR (gl.team_id IS NOT NULL AND has_team_role(gl.team_id, 'assistant_coach'))
        )
    )
  );

-- ── 10. Update RLS on events ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "users can manage their own events" ON public.events;

CREATE POLICY "events: select for team members"
  ON public.events FOR SELECT
  USING (
    auth.uid() = user_id
    OR (team_id IS NOT NULL AND is_team_member_of(team_id))
  );

-- Owner, manager, or assistant_coach can create events.
CREATE POLICY "events: write by assistant_coach+"
  ON public.events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (team_id IS NULL OR has_team_role(team_id, 'assistant_coach'))
  );

CREATE POLICY "events: update by assistant_coach+"
  ON public.events FOR UPDATE
  USING  (auth.uid() = user_id OR (team_id IS NOT NULL AND has_team_role(team_id, 'assistant_coach')))
  WITH CHECK (auth.uid() = user_id OR (team_id IS NOT NULL AND has_team_role(team_id, 'assistant_coach')));

CREATE POLICY "events: delete by assistant_coach+"
  ON public.events FOR DELETE
  USING (auth.uid() = user_id OR (team_id IS NOT NULL AND has_team_role(team_id, 'assistant_coach')));
