import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type TeamRole,
  type Permission,
  ROLE_RANK,
  ROLE_PERMISSIONS,
} from "@/lib/constants/roles";

/**
 * Returns a map of teamId → role for every team the current user belongs to.
 * Useful on cross-team pages (rosters, lineups, events, players) where you
 * need per-team permission checks in one DB round-trip.
 */
export async function getUserTeamRoles(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, TeamRole>> {
  const { data } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", userId);

  const map: Record<string, TeamRole> = {};
  for (const row of data ?? []) {
    map[row.team_id] = row.role as TeamRole;
  }
  return map;
}

/**
 * Returns the current user's role on a team, or null if they have no
 * membership record (e.g. not a member, or not authenticated).
 */
export async function getUserTeamRole(
  supabase: SupabaseClient,
  userId: string,
  teamId: string,
): Promise<TeamRole | null> {
  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();

  return (data?.role as TeamRole) ?? null;
}

/**
 * Throws a plain Error if the role does not satisfy the minimum required role.
 * Useful as an early guard inside server actions.
 */
export function assertMinimumRole(
  role: TeamRole | null | undefined,
  minimum: TeamRole,
  message = "You don't have permission to perform this action.",
): void {
  if (!role || ROLE_RANK[role] < ROLE_RANK[minimum]) {
    throw new Error(message);
  }
}

/**
 * Returns true if the given role has the requested permission.
 */
export function canPerform(
  role: TeamRole | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].has(permission);
}
