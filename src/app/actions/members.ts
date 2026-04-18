"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
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
): Promise<{ error?: string; invited?: boolean }> {
  if (!TEAM_ROLES.includes(role)) return { error: "Invalid role." };
  if (role === "owner") return { error: "Cannot assign the Owner role via invite." };

  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { error: "You must be signed in." };

  const currentRole = await getUserTeamRole(supabase, user.id, teamId);
  if (!currentRole || (currentRole !== "owner" && currentRole !== "manager")) {
    return { error: "Only owners and managers can invite members." };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Look up existing user.
  const { data: targetId } = await supabase.rpc("get_user_id_by_email", {
    p_email: normalizedEmail,
  });

  // ── Case A: user already has an account ─────────────────────────────────────
  if (targetId) {
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
      console.error("addTeamMember insert error:", insertError);
      return { error: "Could not add member. Please try again." };
    }

    revalidatePath(`/teams/${teamId}`);
    return {};
  }

  // ── Case B: no account — send an invite email ────────────────────────────────
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("jmjvhrzgfdhhyhtlgenb")
      ? "https://rosterlylineups.com"
      : "http://localhost:3000");

  // Store the pending invitation so the accept page can find it by token.
  const { data: invite, error: inviteInsertError } = await supabase
    .from("pending_team_invitations")
    .insert({
      team_id:    teamId,
      email:      normalizedEmail,
      role,
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (inviteInsertError || !invite) {
    console.error("pending invitation insert error:", inviteInsertError);
    return { error: "Could not create invitation. Please try again." };
  }

  // Send the invite email via Supabase auth admin.
  try {
    const admin = createAdminClient();
    const redirectTo = `${siteUrl}/auth/confirm?next=/accept-invite`;

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      { redirectTo },
    );

    if (inviteError) {
      console.error("inviteUserByEmail error:", inviteError);
      // Clean up the pending invitation row so it doesn't linger.
      await supabase
        .from("pending_team_invitations")
        .delete()
        .eq("token", invite.token);
      return { error: "Could not send invitation email. Please try again." };
    }
  } catch (err) {
    console.error("Admin client error:", err);
    return {
      error:
        "Email invite is not configured. Add SUPABASE_SERVICE_ROLE_KEY to your environment variables.",
    };
  }

  revalidatePath(`/teams/${teamId}`);
  return { invited: true };
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

// ─── Accept invitation ────────────────────────────────────────────────────────

export async function acceptTeamInvitation(
  token: string,
): Promise<{ error?: string; teamId?: string }> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { error: "You must be signed in to accept an invitation." };

  const admin = createAdminClient();

  const { data: invite, error: fetchError } = await admin
    .from("pending_team_invitations")
    .select("id, team_id, email, role, accepted_at, expires_at")
    .eq("token", token)
    .single();

  if (fetchError || !invite) {
    return { error: "Invitation not found or has already been used." };
  }

  if (invite.accepted_at) {
    return { error: "This invitation has already been accepted." };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { error: "This invitation has expired. Ask the team owner to send a new one." };
  }

  // Verify the signed-in user's email matches the invitation.
  const { data: { user: fullUser } } = await admin.auth.admin.getUserById(user.id);
  const userEmail = fullUser?.email?.toLowerCase() ?? "";
  if (userEmail !== invite.email.toLowerCase()) {
    return {
      error: `This invitation was sent to ${invite.email}. Please sign in with that email address.`,
    };
  }

  // Add user to team_members (ignore duplicate — they're already a member).
  const { error: memberError } = await admin.from("team_members").insert({
    team_id:    invite.team_id,
    user_id:    user.id,
    role:       invite.role,
    invited_by: null,
  });

  if (memberError && memberError.code !== "23505") {
    console.error("acceptTeamInvitation insert error:", memberError);
    return { error: "Could not join the team. Please try again." };
  }

  // Mark accepted.
  await admin
    .from("pending_team_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", token);

  revalidatePath(`/teams/${invite.team_id}`);
  return { teamId: invite.team_id };
}

// ─── Get pending invitations ──────────────────────────────────────────────────

export type PendingInvitation = {
  id:         string;
  email:      string;
  role:       TeamRole;
  created_at: string;
  expires_at: string;
  token:      string;
};

export async function getPendingInvitations(
  teamId: string,
): Promise<{ data?: PendingInvitation[]; error?: string }> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { error: "You must be signed in." };

  const role = await getUserTeamRole(supabase, user.id, teamId);
  if (!role || (role !== "owner" && role !== "manager")) {
    return { error: "Only owners and managers can view invitations." };
  }

  const { data, error } = await supabase
    .from("pending_team_invitations")
    .select("id, email, role, created_at, expires_at, token")
    .eq("team_id", teamId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) return { error: "Could not load pending invitations." };
  return { data: (data ?? []) as PendingInvitation[] };
}

// ─── Cancel pending invitation ────────────────────────────────────────────────

export async function cancelPendingInvitation(
  teamId: string,
  invitationId: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { error: "You must be signed in." };

  const role = await getUserTeamRole(supabase, user.id, teamId);
  if (!role || (role !== "owner" && role !== "manager")) {
    return { error: "Only owners and managers can cancel invitations." };
  }

  const { error } = await supabase
    .from("pending_team_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("team_id", teamId);

  if (error) return { error: "Could not cancel invitation." };
  revalidatePath(`/teams/${teamId}`);
  return {};
}

// ─── Get pending invites for the currently signed-in user (by email) ──────────
// Used by the /accept-invite page after the user lands there via the email link.

export type PendingInviteForUser = {
  id:      string;
  token:   string;
  role:    TeamRole;
  teamId:  string;
  teamName: string;
};

export async function getPendingInvitesForCurrentUser(): Promise<{
  data?: PendingInviteForUser[];
  error?: string;
}> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { error: "You must be signed in." };

  const email = user.email?.toLowerCase();
  if (!email) return { error: "Your account has no email address." };

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("pending_team_invitations")
    .select("id, token, role, team_id, teams(name)")
    .eq("email", email)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getPendingInvitesForCurrentUser error:", error);
    return { error: "Could not load your invitations." };
  }

  const result: PendingInviteForUser[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id:       row.id as string,
    token:    row.token as string,
    role:     row.role as TeamRole,
    teamId:   row.team_id as string,
    teamName: (row.teams as { name: string } | null)?.name ?? "Unknown Team",
  }));

  return { data: result };
}
