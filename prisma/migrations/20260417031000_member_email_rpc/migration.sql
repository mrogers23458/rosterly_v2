-- Returns id + email pairs for a given array of user_ids.
-- Used by getTeamMembers() to show member emails in the UI.
-- SECURITY DEFINER so it can read auth.users without service role.
CREATE OR REPLACE FUNCTION public.get_team_member_emails(p_user_ids uuid[])
RETURNS TABLE (user_id uuid, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = auth, public AS $$
  SELECT id AS user_id, email
  FROM   auth.users
  WHERE  id = ANY(p_user_ids);
$$;
