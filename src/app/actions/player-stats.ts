"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlayerGameStatInput = {
  lineup_id:       string | null;
  game_date:       string | null;
  opponent:        string | null;
  source:          string;
  // Batting
  at_bats:         number;
  hits:            number;
  doubles:         number;
  triples:         number;
  home_runs:       number;
  rbi:             number;
  walks:           number;
  strikeouts_bat:  number;
  stolen_bases:    number;
  runs:            number;
  hit_by_pitch:    number;
  // Pitching
  innings_pitched: number;
  hits_allowed:    number;
  runs_allowed:    number;
  earned_runs:     number;
  walks_allowed:   number;
  strikeouts_pit:  number;
  wild_pitches:    number;
  hit_batters:     number;
  // Fielding
  putouts:         number;
  assists:         number;
  errors:          number;
  notes:           string | null;
};

export type PlayerGameStat = PlayerGameStatInput & {
  id:         string;
  user_id:    string;
  player_id:  string;
  created_at: string;
  updated_at: string;
};

type Ok<T> = { data: T; error?: never };
type Err   = { error: string; data?: never };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getClient() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createPlayerGameStat(
  playerId: string,
  input: PlayerGameStatInput,
): Promise<Ok<PlayerGameStat> | Err> {
  const { supabase, user } = await getClient();
  if (!user) return { error: "You must be signed in." };

  const { data, error } = await supabase
    .from("player_game_stats")
    .insert({
      user_id:         user.id,
      player_id:       playerId,
      lineup_id:       input.lineup_id || null,
      source:          input.source || "manual",
      game_date:       input.game_date || null,
      opponent:        input.opponent?.trim() || null,
      at_bats:         input.at_bats,
      hits:            input.hits,
      doubles:         input.doubles,
      triples:         input.triples,
      home_runs:       input.home_runs,
      rbi:             input.rbi,
      walks:           input.walks,
      strikeouts_bat:  input.strikeouts_bat,
      stolen_bases:    input.stolen_bases,
      runs:            input.runs,
      hit_by_pitch:    input.hit_by_pitch,
      innings_pitched: input.innings_pitched,
      hits_allowed:    input.hits_allowed,
      runs_allowed:    input.runs_allowed,
      earned_runs:     input.earned_runs,
      walks_allowed:   input.walks_allowed,
      strikeouts_pit:  input.strikeouts_pit,
      wild_pitches:    input.wild_pitches,
      hit_batters:     input.hit_batters,
      putouts:         input.putouts,
      assists:         input.assists,
      errors:          input.errors,
      notes:           input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create stat entry." };
  revalidatePath(`/players/${playerId}`);
  return { data: data as PlayerGameStat };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatePlayerGameStat(
  statId: string,
  playerId: string,
  input: PlayerGameStatInput,
): Promise<Ok<PlayerGameStat> | Err> {
  const { supabase, user } = await getClient();
  if (!user) return { error: "You must be signed in." };

  const { data, error } = await supabase
    .from("player_game_stats")
    .update({
      lineup_id:       input.lineup_id || null,
      source:          input.source || "manual",
      game_date:       input.game_date || null,
      opponent:        input.opponent?.trim() || null,
      at_bats:         input.at_bats,
      hits:            input.hits,
      doubles:         input.doubles,
      triples:         input.triples,
      home_runs:       input.home_runs,
      rbi:             input.rbi,
      walks:           input.walks,
      strikeouts_bat:  input.strikeouts_bat,
      stolen_bases:    input.stolen_bases,
      runs:            input.runs,
      hit_by_pitch:    input.hit_by_pitch,
      innings_pitched: input.innings_pitched,
      hits_allowed:    input.hits_allowed,
      runs_allowed:    input.runs_allowed,
      earned_runs:     input.earned_runs,
      walks_allowed:   input.walks_allowed,
      strikeouts_pit:  input.strikeouts_pit,
      wild_pitches:    input.wild_pitches,
      hit_batters:     input.hit_batters,
      putouts:         input.putouts,
      assists:         input.assists,
      errors:          input.errors,
      notes:           input.notes?.trim() || null,
    })
    .eq("id", statId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not update stat entry." };
  revalidatePath(`/players/${playerId}`);
  return { data: data as PlayerGameStat };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deletePlayerGameStat(
  statId: string,
  playerId: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await getClient();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("player_game_stats")
    .delete()
    .eq("id", statId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/players/${playerId}`);
  return {};
}
