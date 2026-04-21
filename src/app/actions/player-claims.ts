"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { hasRole } from "@/lib/constants/roles";
import type { TeamRole } from "@/lib/constants/roles";
import { getUserTeamRole } from "@/lib/permissions";

export type PlayerClaim = {
  id:         string;
  player_id:  string;
  user_id:    string;
  team_id:    string;
  status:     "pending" | "approved" | "rejected";
  message:    string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  player_first_name?: string;
  player_last_name?:  string;
  user_email?:        string;
  user_first_name?:   string;
  user_last_name?:    string;
};

/** Submit a claim for a player (authenticated user → "this is my child"). */
export async function submitPlayerClaim(input: {
  playerId: string;
  teamId:   string;
  message?: string;
}): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Must be a member of the team.
  const role = await getUserTeamRole(supabase, user.id, input.teamId);
  if (!role) return { error: "You are not a member of this team" };

  // Cannot claim if you already have edit access.
  if (hasRole(role as TeamRole, "manager")) {
    return { error: "Managers and owners don't need to claim players" };
  }

  // Check the player exists and belongs to this team (via roster).
  const { data: player } = await supabase
    .from("players")
    .select("id, first_name, last_name, roster_id, claimed_by_user_id")
    .eq("id", input.playerId)
    .single();

  if (!player) return { error: "Player not found" };
  if (player.claimed_by_user_id) return { error: "This player has already been claimed" };

  // Upsert — allows re-submitting a previously rejected claim.
  const { error } = await supabase.from("player_claims").upsert(
    {
      player_id:  input.playerId,
      user_id:    user.id,
      team_id:    input.teamId,
      status:     "pending",
      message:    input.message?.trim() ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "player_id,user_id" },
  );

  if (error) return { error: error.message };

  // Notify team owners and managers.
  const { data: owners } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", input.teamId)
    .in("role", ["owner", "manager"]);

  if (owners && owners.length > 0) {
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", user.id)
      .single();

    const claimantName = [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(" ")
      || user.email
      || "A team member";

    await supabase.from("notifications").insert(
      owners.map((o) => ({
        user_id:    o.user_id,
        title:      `Player claim request`,
        body:       `${claimantName} is requesting to claim ${player.first_name} ${player.last_name} as their child.`,
        link:       `/teams/${input.teamId}`,
        created_at: new Date().toISOString(),
      })),
    );
  }

  return { error: null };
}

/** Approve a pending claim — sets claimed_by_user_id on the player. */
export async function approvePlayerClaim(
  claimId: string,
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Load the claim.
  const { data: claim } = await supabase
    .from("player_claims")
    .select("*")
    .eq("id", claimId)
    .single();

  if (!claim) return { error: "Claim not found" };

  // Verify approver is owner/manager.
  const role = await getUserTeamRole(supabase, user.id, claim.team_id);
  if (!hasRole(role as TeamRole, "manager")) {
    return { error: "Only team owners and managers can approve claims" };
  }

  const now = new Date().toISOString();

  // Update claim status.
  const { error: claimErr } = await supabase
    .from("player_claims")
    .update({ status: "approved", updated_at: now })
    .eq("id", claimId);

  if (claimErr) return { error: claimErr.message };

  // Set claimed_by_user_id on the player.
  const { error: playerErr } = await supabase
    .from("players")
    .update({ claimed_by_user_id: claim.user_id })
    .eq("id", claim.player_id);

  if (playerErr) return { error: playerErr.message };

  // Notify the claimant.
  const { data: player } = await supabase
    .from("players")
    .select("first_name, last_name")
    .eq("id", claim.player_id)
    .single();

  await supabase.from("notifications").insert({
    user_id:    claim.user_id,
    title:      "Player claim approved",
    body:       `Your request to claim ${player?.first_name ?? ""} ${player?.last_name ?? ""} has been approved. You can now edit their profile.`,
    link:       `/players/${claim.player_id}`,
    created_at: now,
  });

  return { error: null };
}

/** Reject a pending claim. */
export async function rejectPlayerClaim(
  claimId: string,
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: claim } = await supabase
    .from("player_claims")
    .select("*")
    .eq("id", claimId)
    .single();

  if (!claim) return { error: "Claim not found" };

  const role = await getUserTeamRole(supabase, user.id, claim.team_id);
  if (!hasRole(role as TeamRole, "manager")) {
    return { error: "Only team owners and managers can reject claims" };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("player_claims")
    .update({ status: "rejected", updated_at: now })
    .eq("id", claimId);

  if (error) return { error: error.message };

  // Notify claimant.
  const { data: player } = await supabase
    .from("players")
    .select("first_name, last_name")
    .eq("id", claim.player_id)
    .single();

  await supabase.from("notifications").insert({
    user_id:    claim.user_id,
    title:      "Player claim not approved",
    body:       `Your request to claim ${player?.first_name ?? ""} ${player?.last_name ?? ""} was not approved. Contact your team manager for details.`,
    link:       `/teams/${claim.team_id}`,
    created_at: now,
  });

  return { error: null };
}

/** Load all pending claims for a team (for team owners/managers). */
export async function getPendingClaimsForTeam(teamId: string): Promise<{
  data: PlayerClaim[];
  error: string | null;
}> {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("player_claims")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  // Enrich with player names.
  const claims = (data ?? []) as PlayerClaim[];
  if (claims.length === 0) return { data: [], error: null };

  const playerIds = [...new Set(claims.map((c) => c.player_id))];
  const { data: players } = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .in("id", playerIds);

  const userIds = [...new Set(claims.map((c) => c.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name")
    .in("user_id", userIds);

  const playerMap  = Object.fromEntries((players  ?? []).map((p) => [p.id, p]));
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

  const enriched = claims.map((c) => ({
    ...c,
    player_first_name: playerMap[c.player_id]?.first_name,
    player_last_name:  playerMap[c.player_id]?.last_name,
    user_first_name:   profileMap[c.user_id]?.first_name,
    user_last_name:    profileMap[c.user_id]?.last_name,
  }));

  return { data: enriched, error: null };
}

/** Load the current user's claim for a specific player (if any). */
export async function getMyClaimForPlayer(playerId: string): Promise<{
  data: PlayerClaim | null;
  error: string | null;
}> {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: null };

  const { data } = await supabase
    .from("player_claims")
    .select("*")
    .eq("player_id", playerId)
    .eq("user_id", user.id)
    .single();

  return { data: (data as PlayerClaim | null) ?? null, error: null };
}
