"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ImportTeamInput = {
  name: string;
  year: string;
  season: string;
  division: string;
  age_group: string;
  team_type: string;
  organization: string;
  is_active: boolean;
};

export type ImportRosterInput = {
  team_id: string;
  name: string;
  season: string;
  year: string;
  notes: string;
  is_active: boolean;
};

export type ImportPlayerInput = {
  first_name: string;
  last_name: string;
  jersey_number: string;
  primary_positions: string[];
  secondary_positions: string[];
  bats: string;
  throws: string;
  is_active: boolean;
};

type Ok<T> = { data: T; error?: never };
type Err   = { error: string; data?: never };

// ─── Create team ────────────────────────────────────────────────────────────

export async function importTeam(
  input: ImportTeamInput,
): Promise<Ok<{ id: string }> | Err> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated." };

  const { data, error } = await supabase
    .from("teams")
    .insert({
      user_id:      user.id,
      name:         input.name,
      year:         input.year,
      season:       input.season,
      division:     input.division,
      age_group:    input.age_group,
      team_type:    input.team_type,
      organization: input.organization || null,
      is_active:    input.is_active,
      is_archived:  false,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Seed the importer as owner so permissions work correctly.
  await supabase.from("team_members").insert({
    team_id:    data.id,
    user_id:    user.id,
    role:       "owner",
    invited_by: null,
  });

  revalidatePath("/teams");
  return { data: { id: data.id } };
}

// ─── Create roster ──────────────────────────────────────────────────────────

export async function importRoster(
  input: ImportRosterInput,
): Promise<Ok<{ id: string }> | Err> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated." };

  const { data, error } = await supabase
    .from("rosters")
    .insert({
      user_id:   user.id,
      team_id:   input.team_id,
      name:      input.name,
      season:    input.season,
      year:      input.year,
      notes:     input.notes || null,
      is_active: input.is_active,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/teams");
  return { data: { id: data.id } };
}

// ─── Bulk-create players ─────────────────────────────────────────────────────

export async function importPlayers(
  players: ImportPlayerInput[],
  rosterId: string,
  teamId: string,
): Promise<Ok<{ count: number }> | Err> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated." };

  const rows = players.map((p) => ({
    user_id:             user.id,
    roster_id:           rosterId,
    first_name:          p.first_name,
    last_name:           p.last_name,
    jersey_number:       p.jersey_number || null,
    date_of_birth:       null,
    primary_positions:   p.primary_positions,
    secondary_positions: p.secondary_positions,
    bats:                p.bats || null,
    throws:              p.throws || null,
    is_active:           p.is_active,
  }));

  const { error, count } = await supabase
    .from("players")
    .insert(rows, { count: "exact" });

  if (error) return { error: error.message };
  revalidatePath(`/rosters/${teamId}/${rosterId}`);
  return { data: { count: count ?? players.length } };
}
