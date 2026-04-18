-- Fix 1: Add the missing DELETE policy so owners/managers can cancel invitations.
CREATE POLICY "pending_invitations: delete by owner/manager"
  ON public.pending_team_invitations FOR DELETE
  USING (has_team_role(team_id, 'manager'));

-- Fix 2: Drop the overly-broad SELECT policy (USING (true) let anyone read all rows).
-- The accept-invite page uses the service-role admin client and doesn't need this.
DROP POLICY IF EXISTS "pending_invitations: select own by token" ON public.pending_team_invitations;
