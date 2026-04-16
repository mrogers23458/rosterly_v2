"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ImportPlayerInput } from "@/app/actions/import";

export type PlayerFormState = {
  error?: string;
  success?: boolean;
};

export async function createPlayer(
  _prev: PlayerFormState,
  formData: FormData,
): Promise<PlayerFormState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be signed in." };

  const rosterId = (formData.get("roster_id") as string | null)?.trim() ?? "";
  const teamIdRaw  = (formData.get("team_id") as string | null)?.trim() ?? "";
  if (!rosterId) return { error: "Roster is required." };

  const { data: roster, error: rosterErr } = await supabase
    .from("rosters")
    .select("id, team_id, user_id")
    .eq("id", rosterId)
    .eq("user_id", user.id)
    .single();

  if (rosterErr || !roster) return { error: "Roster not found." };
  if (roster.team_id != null) {
    if (!teamIdRaw || roster.team_id !== teamIdRaw) {
      return { error: "Team does not match this roster." };
    }
  }

  const firstName   = (formData.get("first_name")  as string | null)?.trim();
  const lastName    = (formData.get("last_name")   as string | null)?.trim();
  const preferred   = (formData.get("preferred_name") as string | null)?.trim() || null;
  const jersey      = (formData.get("jersey_number")  as string | null)?.trim() || null;
  const dob         = (formData.get("date_of_birth")  as string | null)?.trim();
  const bats        = (formData.get("bats")   as string | null) || null;
  const throws_hand = (formData.get("throws") as string | null) || null;
  const primaryPos  = formData.getAll("primary_positions")   as string[];
  const secondaryPos= formData.getAll("secondary_positions") as string[];
  const isActive    = formData.get("is_active") === "true";
  const parentName  = (formData.get("parent_guardian_name")  as string | null)?.trim() || null;
  const parentEmail = (formData.get("parent_guardian_email") as string | null)?.trim() || null;
  const parentPhone = (formData.get("parent_guardian_phone") as string | null)?.trim() || null;
  const medical     = (formData.get("medical_notes") as string | null)?.trim() || null;
  const uniform     = (formData.get("uniform_size")  as string | null) || null;
  const notes       = (formData.get("notes") as string | null)?.trim() || null;

  if (!firstName) return { error: "First name is required." };
  if (!lastName)  return { error: "Last name is required." };

  const { error } = await supabase.from("players").insert({
    user_id:               user.id,
    roster_id:             rosterId,
    first_name:            firstName,
    last_name:             lastName,
    preferred_name:        preferred,
    jersey_number:         jersey,
    date_of_birth:         dob || null,
    bats,
    throws:                throws_hand,
    primary_positions:     primaryPos,
    secondary_positions:   secondaryPos,
    is_active:             isActive,
    parent_guardian_name:  parentName,
    parent_guardian_email: parentEmail,
    parent_guardian_phone: parentPhone,
    medical_notes:         medical,
    uniform_size:          uniform,
    notes,
  });

  if (error) {
    console.error("Player insert error:", error);
    return { error: "Could not add player. Please try again." };
  }

  revalidatePath("/players");
  revalidatePath("/rosters");
  if (teamIdRaw) revalidatePath(`/rosters/${teamIdRaw}/${rosterId}`);
  return { success: true };
}

function revalidatePlayerContext(teamId: string | null | undefined, rosterId: string) {
  revalidatePath("/players");
  revalidatePath("/rosters");
  if (teamId) revalidatePath(`/rosters/${teamId}/${rosterId}`);
}

// ─── Toggle active (treated as archive on roster) ───────────────────────────

export async function setPlayerIsActive(
  playerId: string,
  rosterId: string,
  teamId: string | null,
  isActive: boolean,
): Promise<{ error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("players")
    .update({ is_active: isActive })
    .eq("id", playerId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Player active toggle error:", error);
    return { error: "Could not update player. Please try again." };
  }

  revalidatePlayerContext(teamId ?? null, rosterId);
  return {};
}

// ─── Update ────────────────────────────────────────────────────────────────

export async function updatePlayer(
  playerId: string,
  teamId: string | null,
  rosterId: string,
  _prev: PlayerFormState,
  formData: FormData,
): Promise<PlayerFormState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be signed in." };

  const firstName   = (formData.get("first_name")  as string | null)?.trim();
  const lastName    = (formData.get("last_name")   as string | null)?.trim();
  const preferred   = (formData.get("preferred_name") as string | null)?.trim() || null;
  const jersey      = (formData.get("jersey_number")  as string | null)?.trim() || null;
  const dob         = (formData.get("date_of_birth")  as string | null)?.trim();
  const bats        = (formData.get("bats")   as string | null) || null;
  const throws_hand = (formData.get("throws") as string | null) || null;
  const primaryPos  = formData.getAll("primary_positions")   as string[];
  const secondaryPos= formData.getAll("secondary_positions") as string[];
  const isActive    = formData.get("is_active") === "true";
  const parentName  = (formData.get("parent_guardian_name")  as string | null)?.trim() || null;
  const parentEmail = (formData.get("parent_guardian_email") as string | null)?.trim() || null;
  const parentPhone = (formData.get("parent_guardian_phone") as string | null)?.trim() || null;
  const medical     = (formData.get("medical_notes") as string | null)?.trim() || null;
  const uniform     = (formData.get("uniform_size")  as string | null) || null;
  const notes       = (formData.get("notes") as string | null)?.trim() || null;

  if (!firstName) return { error: "First name is required." };
  if (!lastName)  return { error: "Last name is required." };

  const { error } = await supabase
    .from("players")
    .update({
      first_name:            firstName,
      last_name:             lastName,
      preferred_name:        preferred,
      jersey_number:         jersey,
      date_of_birth:         dob || null,
      bats,
      throws:                throws_hand,
      primary_positions:     primaryPos,
      secondary_positions:   secondaryPos,
      is_active:             isActive,
      parent_guardian_name:  parentName,
      parent_guardian_email: parentEmail,
      parent_guardian_phone: parentPhone,
      medical_notes:         medical,
      uniform_size:          uniform,
      notes,
    })
    .eq("id", playerId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Player update error:", error);
    return { error: "Could not update player. Please try again." };
  }

  revalidatePlayerContext(teamId, rosterId);
  return { success: true };
}

// ─── Delete ────────────────────────────────────────────────────────────────

export async function deletePlayer(
  playerId: string,
  teamId: string | null,
  rosterId: string,
): Promise<{ error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Player delete error:", error);
    return { error: "Could not delete player. Please try again." };
  }

  revalidatePlayerContext(teamId, rosterId);
  return {};
}

// ─── Merge from import ────────────────────────────────────────────────────────
// Fills in empty fields and unions position arrays — never overwrites existing data.

export async function mergePlayerFromImport(
  existingId: string,
  importData: ImportPlayerInput,
  teamId: string | null,
  rosterId: string,
): Promise<{ error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be signed in." };

  const { data: existing, error: fetchErr } = await supabase
    .from("players")
    .select("jersey_number, bats, throws, primary_positions, secondary_positions")
    .eq("id", existingId)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !existing) return { error: "Player not found." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};

  if (!existing.jersey_number && importData.jersey_number) update.jersey_number = importData.jersey_number;
  if (!existing.bats   && importData.bats)   update.bats   = importData.bats;
  if (!existing.throws && importData.throws) update.throws = importData.throws;

  // Union position arrays — order: existing first, new at the end
  const mergedPrimary   = [...new Set([...(existing.primary_positions   ?? []), ...(importData.primary_positions   ?? [])])];
  const mergedSecondary = [...new Set([...(existing.secondary_positions ?? []), ...(importData.secondary_positions ?? [])])];
  if (mergedPrimary.length   !== (existing.primary_positions   ?? []).length) update.primary_positions   = mergedPrimary;
  if (mergedSecondary.length !== (existing.secondary_positions ?? []).length) update.secondary_positions = mergedSecondary;

  if (Object.keys(update).length === 0) return {}; // nothing to change

  const { error } = await supabase
    .from("players")
    .update(update)
    .eq("id", existingId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Player merge error:", error);
    return { error: "Could not merge player. Please try again." };
  }

  revalidatePlayerContext(teamId, rosterId);
  return {};
}
