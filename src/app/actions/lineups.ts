"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type LineupEntryInput = {
  batting_order: number;
  jersey_number: string;
  player_name: string;
  innings: string[];
};

export type CreateLineupInput = {
  teamId: string;
  rosterId: string | null;
  name: string;
  gameDate: string | null;
  notes: string | null;
  inningCount: number;
  entries: LineupEntryInput[];
};

export type LineupActionResult = { error?: string; success?: boolean; lineupId?: string };

export async function createLineup(input: CreateLineupInput): Promise<LineupActionResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be signed in." };

  if (!input.name.trim()) return { error: "Lineup name is required." };

  const { data: lineup, error: lineupErr } = await supabase
    .from("game_lineups")
    .insert({
      user_id:      user.id,
      team_id:      input.teamId,
      roster_id:    input.rosterId || null,
      name:         input.name.trim(),
      game_date:    input.gameDate || null,
      notes:        input.notes?.trim() || null,
      inning_count: input.inningCount,
    })
    .select("id")
    .single();

  if (lineupErr || !lineup) {
    console.error("Lineup create error:", lineupErr);
    return { error: "Could not create lineup. Please try again." };
  }

  if (input.entries.length > 0) {
    const rows = input.entries.map((e) => ({
      lineup_id:     lineup.id,
      batting_order: e.batting_order,
      jersey_number: e.jersey_number || null,
      player_name:   e.player_name,
      innings:       e.innings,
    }));

    const { error: entriesErr } = await supabase.from("lineup_entries").insert(rows);

    if (entriesErr) {
      console.error("Lineup entries error:", entriesErr);
      await supabase.from("game_lineups").delete().eq("id", lineup.id);
      return { error: "Could not save lineup entries. Please try again." };
    }
  }

  revalidatePath(`/teams/${input.teamId}`);
  revalidatePath("/lineups");
  revalidatePath(`/lineups/${lineup.id}`);
  return { success: true, lineupId: lineup.id };
}

// ─── Fetch lineups for a team (used by duplicate picker) ──────────────────

export type TeamLineupSummary = {
  id: string;
  name: string;
  game_date: string | null;
  inning_count: number;
  is_archived: boolean;
  created_at: string;
};

export async function fetchTeamLineups(teamId: string): Promise<TeamLineupSummary[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return [];

  const { data } = await supabase
    .from("game_lineups")
    .select("id, name, game_date, inning_count, is_archived, created_at")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []) as TeamLineupSummary[];
}

// ─── Fetch entries (used by edit modal) ────────────────────────────────────

export type LineupEntryRow = {
  id: string;
  batting_order: number;
  jersey_number: string | null;
  player_name: string;
  innings: string[];
};

export async function fetchLineupEntries(lineupId: string): Promise<LineupEntryRow[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return [];

  const { data } = await supabase
    .from("lineup_entries")
    .select("id, batting_order, jersey_number, player_name, innings")
    .eq("lineup_id", lineupId)
    .order("batting_order", { ascending: true });

  return (data ?? []) as LineupEntryRow[];
}

// ─── Full update (replaces name + date + entries) ──────────────────────────

export type UpdateLineupFullInput = {
  lineupId: string;
  teamId: string;
  name: string;
  gameDate: string | null;
  notes: string | null;
  inningCount: number;
  entries: LineupEntryInput[];
};

export async function updateLineupFull(input: UpdateLineupFullInput): Promise<LineupActionResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be signed in." };

  if (!input.name.trim()) return { error: "Lineup name is required." };

  // 1. Update the parent lineup row
  const { error: updateErr } = await supabase
    .from("game_lineups")
    .update({
      name:         input.name.trim(),
      game_date:    input.gameDate || null,
      notes:        input.notes?.trim() || null,
      inning_count: input.inningCount,
    })
    .eq("id", input.lineupId)
    .eq("user_id", user.id);

  if (updateErr) {
    console.error("Lineup full-update error:", updateErr);
    return { error: "Could not update lineup. Please try again." };
  }

  // 2. Replace all entries (delete + re-insert)
  const { error: deleteErr } = await supabase
    .from("lineup_entries")
    .delete()
    .eq("lineup_id", input.lineupId);

  if (deleteErr) {
    console.error("Lineup entries delete error:", deleteErr);
    return { error: "Could not replace lineup entries. Please try again." };
  }

  if (input.entries.length > 0) {
    const rows = input.entries.map((e) => ({
      lineup_id:     input.lineupId,
      batting_order: e.batting_order,
      jersey_number: e.jersey_number || null,
      player_name:   e.player_name,
      innings:       e.innings,
    }));

    const { error: insertErr } = await supabase.from("lineup_entries").insert(rows);

    if (insertErr) {
      console.error("Lineup entries re-insert error:", insertErr);
      return { error: "Could not save updated lineup entries. Please try again." };
    }
  }

  revalidatePath(`/teams/${input.teamId}`);
  revalidatePath("/lineups");
  revalidatePath(`/lineups/${input.lineupId}`);
  return { success: true, lineupId: input.lineupId };
}

// ─── Update ────────────────────────────────────────────────────────────────

export async function updateLineup(
  lineupId: string,
  teamId: string,
  _prev: LineupActionResult,
  formData: FormData,
): Promise<LineupActionResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be signed in." };

  const name     = (formData.get("name")      as string | null)?.trim();
  const gameDate = (formData.get("game_date") as string | null)?.trim() || null;
  const notes    = (formData.get("notes")     as string | null)?.trim() || null;

  if (!name) return { error: "Lineup name is required." };

  const { error } = await supabase
    .from("game_lineups")
    .update({ name, game_date: gameDate, notes })
    .eq("id", lineupId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Lineup update error:", error);
    return { error: "Could not update lineup. Please try again." };
  }

  revalidatePath(`/teams/${teamId}`);
  return { success: true };
}

// ─── Archive ───────────────────────────────────────────────────────────────

export async function setLineupArchived(
  lineupId: string,
  teamId: string,
  archived: boolean,
): Promise<{ error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("game_lineups")
    .update({ is_archived: archived })
    .eq("id", lineupId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/lineups");
  revalidatePath(`/lineups/${lineupId}`);
  return {};
}

// ─── Delete ────────────────────────────────────────────────────────────────

export async function deleteLineup(
  lineupId: string,
  teamId: string,
): Promise<{ error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("game_lineups")
    .delete()
    .eq("id", lineupId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Lineup delete error:", error);
    return { error: "Could not delete lineup. Please try again." };
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/lineups");
  return {};
}
