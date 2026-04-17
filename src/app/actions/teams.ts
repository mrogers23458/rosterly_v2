"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getUserTeamRole } from "@/lib/permissions";

export type TeamFormState = {
  error?: string;
  success?: boolean;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

async function getAuthenticatedClient() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

function parseTeamFormData(formData: FormData) {
  const year = (formData.get("year") as string | null)?.trim() ?? "";
  if (!/^\d{4}$/.test(year)) {
    return { error: "Year must be exactly 4 digits (e.g. 2026)." } as const;
  }
  return {
    name: (formData.get("name") as string | null)?.trim(),
    year,
    season: (formData.get("season") as string | null)?.trim(),
    division: (formData.get("division") as string | null)?.trim(),
    ageGroup: (formData.get("age_group") as string | null)?.trim(),
    teamType: (formData.get("team_type") as string | null)?.trim(),
    organization: (formData.get("organization") as string | null)?.trim() || null,
    isActive: formData.get("is_active") === "true",
  };
}

// ─── Create ────────────────────────────────────────────────────────────────

export async function createTeam(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { error: "You must be signed in to create a team." };

  const parsed = parseTeamFormData(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { name, year, season, division, ageGroup, teamType, organization, isActive } = parsed;
  if (!name || !season || !division || !ageGroup || !teamType) {
    return { error: "Name, season, division, age group, and team type are required." };
  }

  const { data: newTeam, error } = await supabase
    .from("teams")
    .insert({
      user_id: user.id,
      name,
      year,
      season,
      division,
      age_group: ageGroup,
      team_type: teamType,
      organization,
      is_active: isActive,
      is_archived: false,
    })
    .select("id")
    .single();

  if (error || !newTeam) {
    console.error("Team insert error:", error);
    return { error: "Could not create team. Please try again." };
  }

  // Seed the creator as the Owner in team_members.
  await supabase.from("team_members").insert({
    team_id:    newTeam.id,
    user_id:    user.id,
    role:       "owner",
    invited_by: null,
  });

  revalidatePath("/teams");
  return { success: true };
}

// ─── Update ────────────────────────────────────────────────────────────────

export async function updateTeam(
  teamId: string,
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { error: "You must be signed in." };

  const parsed = parseTeamFormData(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { name, year, season, division, ageGroup, teamType, organization, isActive } = parsed;
  if (!name || !season || !division || !ageGroup || !teamType) {
    return { error: "Name, season, division, age group, and team type are required." };
  }

  // Require at least manager role to edit team settings.
  const role = await getUserTeamRole(supabase, user.id, teamId);
  if (!role || (role !== "owner" && role !== "manager")) {
    return { error: "Only owners and managers can edit team settings." };
  }

  const { error } = await supabase
    .from("teams")
    .update({ name, year, season, division, age_group: ageGroup, team_type: teamType, organization, is_active: isActive })
    .eq("id", teamId);

  if (error) {
    console.error("Team update error:", error);
    return { error: "Could not update team. Please try again." };
  }

  revalidatePath("/teams");
  return { success: true };
}

// ─── Archive / Unarchive ───────────────────────────────────────────────────

export async function setTeamArchived(teamId: string, archived: boolean): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { error: "You must be signed in." };

  // Only the owner can archive/unarchive a team.
  const role = await getUserTeamRole(supabase, user.id, teamId);
  if (role !== "owner") {
    return { error: "Only the team owner can archive or unarchive a team." };
  }

  const { error } = await supabase
    .from("teams")
    .update({ is_archived: archived })
    .eq("id", teamId);

  if (error) {
    console.error("Team archive error:", error);
    return { error: "Could not update team. Please try again." };
  }

  revalidatePath("/teams");
  return {};
}

// ─── Delete ────────────────────────────────────────────────────────────────

export async function deleteTeam(teamId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { error: "You must be signed in." };

  // Only the owner can delete a team.
  const role = await getUserTeamRole(supabase, user.id, teamId);
  if (role !== "owner") {
    return { error: "Only the team owner can delete a team." };
  }

  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId);

  if (error) {
    console.error("Team delete error:", error);
    return { error: "Could not delete team. Please try again." };
  }

  revalidatePath("/teams");
  return {};
}
