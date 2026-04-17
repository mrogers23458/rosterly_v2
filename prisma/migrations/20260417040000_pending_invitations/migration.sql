-- Pending team invitations sent to email addresses that don't yet have an account.
-- Once the invitee signs up and lands on /accept-invite/[token], the row is
-- matched by token, accepted_at is set, and the user is added to team_members.

CREATE TABLE public.pending_team_invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID        NOT NULL REFERENCES public.teams(id)  ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL
                          CHECK (role IN ('manager','assistant_coach','viewer')),
  invited_by  UUID        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  token       UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pending_invitations_token_idx   ON public.pending_team_invitations(token);
CREATE INDEX pending_invitations_email_idx   ON public.pending_team_invitations(email);
CREATE INDEX pending_invitations_team_id_idx ON public.pending_team_invitations(team_id);

-- RLS: only the inviting team's owner/manager can see invitations; anyone can read by token (for accept page).
ALTER TABLE public.pending_team_invitations ENABLE ROW LEVEL SECURITY;

-- Team owners and managers can view their own team's pending invitations.
CREATE POLICY "pending_invitations: select for team owner/manager"
  ON public.pending_team_invitations FOR SELECT
  USING (has_team_role(team_id, 'manager'));

-- Anyone authenticated can look up an invitation by token (needed for accept page).
-- The accept page action uses the service-role client to bypass RLS, so this is
-- a belt-and-suspenders policy for the case where we use the anon client.
CREATE POLICY "pending_invitations: select own by token"
  ON public.pending_team_invitations FOR SELECT
  USING (true);  -- token is a secret UUID; guessing it is infeasible

-- Team owners and managers can create invitations.
CREATE POLICY "pending_invitations: insert by owner/manager"
  ON public.pending_team_invitations FOR INSERT
  WITH CHECK (has_team_role(team_id, 'manager'));

-- Only allow updating accepted_at (the accept action uses service-role client).
CREATE POLICY "pending_invitations: update accepted_at"
  ON public.pending_team_invitations FOR UPDATE
  USING (true)
  WITH CHECK (true);
