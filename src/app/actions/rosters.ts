"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type RosterFormState = {
  error?: string;
  success?: boolean;
};

// ─── Create ────────────────────────────────────────────────────────────────

export async function createRoster(
  _prev: RosterFormState,
  formData: FormData,
): Promise<RosterFormState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { error: "You must be signed in." };

  const name     = (formData.get("name")    as string | null)?.trim();
  const teamId   = (formData.get("team_id") as string | null)?.trim() || null;
  const season   = (formData.get("season")  as string | null)?.trim();
  const year     = (formData.get("year")    as string | null)?.trim() ?? "";
  const notes    = (formData.get("notes")   as string | null)?.trim() || null;
  const isActive = formData.get("is_active") === "true";

  if (!name)   return { error: "Roster name is required." };
  if (!season) return { error: "Season is required." };
  if (!/^\d{4}$/.test(year)) return { error: "Year must be exactly 4 digits (e.g. 2026)." };

  // If a team was selected, verify it belongs to this user
  if (teamId) {
    const { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .eq("user_id", user.id)
      .single();
    if (!team) return { error: "Team not found." };
  }

  const { error } = await supabase.from("rosters").insert({
    user_id:   user.id,
    team_id:   teamId,
    name,
    season,
    year,
    is_active: isActive,
    notes,
  });

  if (error) {
    console.error("Roster insert error:", error);
    return { error: "Could not create roster. Please try again." };
  }

  revalidatePath("/teams");
  revalidatePath("/rosters");
  revalidatePath("/players");
  if (teamId) revalidatePath(`/teams/${teamId}`);
  return { success: true };
}

// ─── Update ────────────────────────────────────────────────────────────────

export async function updateRoster(
  rosterId: string,
  /** The team the roster belonged to before this edit (may be null). Used for revalidation. */
  oldTeamId: string | null,
  _prev: RosterFormState,
  formData: FormData,
): Promise<RosterFormState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be signed in." };

  const name      = (formData.get("name")    as string | null)?.trim();
  const newTeamId = (formData.get("team_id") as string | null)?.trim() || null;
  const season    = (formData.get("season")  as string | null)?.trim();
  const year      = (formData.get("year")    as string | null)?.trim() ?? "";
  const notes     = (formData.get("notes")   as string | null)?.trim() || null;
  const isActive  = formData.get("is_active") === "true";

  if (!name)   return { error: "Roster name is required." };
  if (!season) return { error: "Season is required." };
  if (!/^\d{4}$/.test(year)) return { error: "Year must be exactly 4 digits (e.g. 2026)." };

  // If a new team was selected, verify it belongs to this user
  if (newTeamId) {
    const { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("id", newTeamId)
      .eq("user_id", user.id)
      .single();
    if (!team) return { error: "Team not found." };
  }

  const { error } = await supabase
    .from("rosters")
    .update({ name, team_id: newTeamId, season, year, is_active: isActive, notes })
    .eq("id", rosterId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Roster update error:", error);
    return { error: "Could not update roster. Please try again." };
  }

  revalidatePath("/teams");
  revalidatePath("/rosters");
  revalidatePath("/players");
  if (oldTeamId) revalidatePath(`/teams/${oldTeamId}`);
  if (newTeamId && newTeamId !== oldTeamId) revalidatePath(`/teams/${newTeamId}`);
  return { success: true };
}

// ─── Archive ───────────────────────────────────────────────────────────────

export async function setRosterArchived(
  rosterId: string,
  teamId: string | null,
  archived: boolean,
): Promise<{ error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("rosters")
    .update({ is_archived: archived })
    .eq("id", rosterId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/rosters");
  revalidatePath("/players");
  if (teamId) revalidatePath(`/teams/${teamId}`);
  return {};
}

// ─── Delete ────────────────────────────────────────────────────────────────

export async function deleteRoster(
  rosterId: string,
  teamId: string | null,
): Promise<{ error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("rosters")
    .delete()
    .eq("id", rosterId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Roster delete error:", error);
    return { error: "Could not delete roster. Please try again." };
  }

  revalidatePath("/rosters");
  revalidatePath("/players");
  if (teamId) revalidatePath(`/teams/${teamId}`);
  return {};
}
