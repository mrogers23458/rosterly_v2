"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getUserTeamRole } from "@/lib/permissions";
import { type TeamRole, type TeamMember, TEAM_ROLES } from "@/lib/constants/roles";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthenticatedClient() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

// ─── Get team members ─────────────────────────────────────────────────────────

export type TeamMemberWithEmail = TeamMember & { email: string };

export async function getTeamMembers(
  teamId: string,
): Promise<{ data?: TeamMemberWithEmail[]; error?: string }> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { error: "You must be signed in." };

  const role = await getUserTeamRole(supabase, user.id, teamId);
  if (!role) return { error: "You are not a member of this team." };

  // Fetch members
  const { data: members, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  if (error) return { error: "Could not load team members." };

  // Fetch emails via the SECURITY DEFINER function won't work in bulk here.
  // Instead we fetch the user_ids and look them up via a Postgres RPC.
  // For MVP we display a truncated user_id; the invite flow stores the email
  // at invite time via the RPC get_user_id_by_email.
  // We expose a separate RPC get_team_member_emails that returns id+email pairs.
  const userIds = (members ?? []).map((m) => m.user_id as string);

  let emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: emailRows } = await supabase.rpc("get_team_member_emails", {
      p_user_ids: userIds,
    });
    for (const row of emailRows ?? []) {
      emailMap[row.user_id] = row.email;
    }
  }

  const result: TeamMemberWithEmail[] = (members ?? []).map((m) => ({
    ...(m as TeamMember),
    email: emailMap[m.user_id] ?? "",
  }));

  return { data: result };
}

// ─── Add member by email ──────────────────────────────────────────────────────

export async function addTeamMember(
  teamId: string,
  email: string,
  role: TeamRole,
): Promise<{ error?: string }> {
  if (!TEAM_ROLES.includes(role)) return { error: "Invalid role." };
  if (role === "owner") return { error: "Cannot assign the Owner role via invite." };

  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { error: "You must be signed in." };

  const currentRole = await getUserTeamRole(supabase, user.id, teamId);
  if (!currentRole || (currentRole !== "owner" && currentRole !== "manager")) {
    return { error: "Only owners and managers can invite members." };
  }

  // Look up the invitee's user ID via the SECURITY DEFINER function.
  const { data: targetId, error: lookupError } = await supabase.rpc(
    "get_user_id_by_email",
    { p_email: email.trim().toLowerCase() },
  );

  if (lookupError || !targetId) {
    return {
      error:
        "No Rosterly account found for that email address. They need to sign up first.",
    };
  }

  if (targetId === user.id) {
    return { error: "You are already a member of this team." };
  }

  const { error: insertError } = await supabase.from("team_members").insert({
    team_id:    teamId,
    user_id:    targetId,
    role,
    invited_by: user.id,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "That user is already a member of this team." };
    }
    console.error("addTeamMember error:", insertError);
    return { error: "Could not add member. Please try again." };
  }

  revalidatePath(`/teams/${teamId}`);
  return {};
}

// ─── Update member role ───────────────────────────────────────────────────────

export async function updateMemberRole(
  teamId: string,
  memberId: string,
  newRole: TeamRole,
): Promise<{ error?: string }> {
  if (!TEAM_ROLES.includes(newRole)) return { error: "Invalid role." };

  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { error: "You must be signed in." };

  const currentRole = await getUserTeamRole(supabase, user.id, teamId);
  if (currentRole !== "owner") {
    return { error: "Only the team owner can change member roles." };
  }

  // Prevent the owner from downgrading themselves.
  const { data: targetMember } = await supabase
    .from("team_members")
    .select("user_id, role")
    .eq("id", memberId)
    .eq("team_id", teamId)
    .single();

  if (!targetMember) return { error: "Member not found." };
  if (targetMember.user_id === user.id && newRole !== "owner") {
    return { error: "You cannot change your own owner role. Transfer ownership first." };
  }

  const { error } = await supabase
    .from("team_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("team_id", teamId);

  if (error) {
    console.error("updateMemberRole error:", error);
    return { error: "Could not update role. Please try again." };
  }

  revalidatePath(`/teams/${teamId}`);
  return {};
}

// ─── Remove member ────────────────────────────────────────────────────────────

export async function removeTeamMember(
  teamId: string,
  memberId: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { error: "You must be signed in." };

  const currentRole = await getUserTeamRole(supabase, user.id, teamId);
  if (!currentRole) return { error: "You are not a member of this team." };

  // Fetch the target member to check constraints.
  const { data: targetMember } = await supabase
    .from("team_members")
    .select("user_id, role")
    .eq("id", memberId)
    .eq("team_id", teamId)
    .single();

  if (!targetMember) return { error: "Member not found." };

  // Only owner can remove others; anyone can remove themselves.
  if (targetMember.user_id !== user.id && currentRole !== "owner" && currentRole !== "manager") {
    return { error: "Only owners and managers can remove members." };
  }

  // Protect the last owner.
  if (targetMember.role === "owner") {
    const { count } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("role", "owner");

    if ((count ?? 0) <= 1) {
      return {
        error:
          "Cannot remove the last owner. Transfer ownership to another member first.",
      };
    }
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", memberId)
    .eq("team_id", teamId);

  if (error) {
    console.error("removeTeamMember error:", error);
    return { error: "Could not remove member. Please try again." };
  }

  revalidatePath(`/teams/${teamId}`);
  return {};
}
