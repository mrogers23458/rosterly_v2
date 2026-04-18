/**
 * All Supabase queries used by the mobile app.
 * Called directly against the Supabase backend with RLS enforced.
 */
import { getSupabase } from "@/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  user_id: string;
  name: string;
  year: number;
  season: string | null;
  division: string | null;
  age_group: string | null;
  team_type: string | null;
  organization: string | null;
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
}

export interface Roster {
  id: string;
  user_id: string;
  team_id: string | null;
  name: string;
  season: string | null;
  year: number | null;
  notes: string | null;
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
  team?: { name: string } | null;
}

export interface Player {
  id: string;
  user_id: string;
  roster_id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  jersey_number: string | null;
  primary_positions: string[];
  secondary_positions: string[];
  bats: string | null;
  throws: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface GameLineup {
  id: string;
  user_id: string;
  team_id: string | null;
  roster_id: string | null;
  name: string;
  game_date: string | null;
  notes: string | null;
  inning_count: number;
  is_archived: boolean;
  created_at: string;
  team?: { name: string } | null;
  roster?: { name: string } | null;
}

export interface TeamEvent {
  id: string;
  user_id: string;
  team_id: string | null;
  type: string;
  title: string;
  opponent: string | null;
  event_date: string;
  start_time: string | null;
  location: string | null;
  notes: string | null;
  is_archived: boolean;
  recurrence_type: string | null;
  created_at: string;
  team?: { name: string } | null;
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export async function fetchTeams(): Promise<Team[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("teams")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });
  return (data as Team[]) ?? [];
}

export async function fetchTeam(id: string): Promise<Team | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("teams").select("*").eq("id", id).single();
  return (data as Team) ?? null;
}

export type CreateTeamInput = {
  name: string;
  year: number;
  season?: string;
  division?: string;
  age_group?: string;
  team_type?: string;
  organization?: string;
  is_active?: boolean;
};

export async function createTeam(input: CreateTeamInput): Promise<{ id: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data, error } = await sb
    .from("teams")
    .insert({ ...input, user_id: user.id, is_archived: false, is_active: input.is_active ?? true })
    .select("id")
    .single();
  if (error || !data) return null;

  // seed team_members with owner role
  await sb.from("team_members").insert({
    team_id: data.id, user_id: user.id, role: "owner",
  });

  return { id: data.id };
}

export async function updateTeam(id: string, input: Partial<CreateTeamInput>): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("teams").update(input).eq("id", id);
  return !error;
}

export async function archiveTeam(id: string, archived = true): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("teams").update({ is_archived: archived }).eq("id", id);
  return !error;
}

export async function deleteTeam(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("teams").delete().eq("id", id);
  return !error;
}

// ─── Rosters ─────────────────────────────────────────────────────────────────

export async function fetchRosters(teamId?: string): Promise<Roster[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb
    .from("rosters")
    .select("*, team:teams(name)")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });
  if (teamId) q = q.eq("team_id", teamId);
  const { data } = await q;
  return (data as Roster[]) ?? [];
}

export async function fetchRoster(id: string): Promise<Roster | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("rosters").select("*, team:teams(name)").eq("id", id).single();
  return (data as Roster) ?? null;
}

export type CreateRosterInput = {
  name: string;
  team_id?: string | null;
  season?: string;
  year?: number | null;
  notes?: string;
  is_active?: boolean;
};

export async function createRoster(input: CreateRosterInput): Promise<{ id: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb
    .from("rosters")
    .insert({ ...input, user_id: user.id, is_archived: false, is_active: input.is_active ?? true })
    .select("id")
    .single();
  if (error || !data) return null;
  return { id: data.id };
}

export async function updateRoster(id: string, input: Partial<CreateRosterInput>): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("rosters").update(input).eq("id", id);
  return !error;
}

export async function archiveRoster(id: string, archived = true): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("rosters").update({ is_archived: archived }).eq("id", id);
  return !error;
}

export async function deleteRoster(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("rosters").delete().eq("id", id);
  return !error;
}

// ─── Players ─────────────────────────────────────────────────────────────────

export async function fetchPlayers(rosterId: string): Promise<Player[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("players")
    .select("*")
    .eq("roster_id", rosterId)
    .order("jersey_number", { ascending: true, nullsFirst: false });
  return (data as Player[]) ?? [];
}

export type CreatePlayerInput = {
  roster_id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  jersey_number?: string;
  primary_positions?: string[];
  secondary_positions?: string[];
  bats?: string;
  throws?: string;
  is_active?: boolean;
  notes?: string;
};

export async function createPlayer(input: CreatePlayerInput): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const { error } = await sb.from("players").insert({
    ...input,
    user_id: user.id,
    primary_positions: input.primary_positions ?? [],
    secondary_positions: input.secondary_positions ?? [],
    is_active: input.is_active ?? true,
  });
  return !error;
}

export async function updatePlayer(id: string, input: Partial<CreatePlayerInput>): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("players").update(input).eq("id", id);
  return !error;
}

export async function deletePlayer(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("players").delete().eq("id", id);
  return !error;
}

export async function bulkCreatePlayers(
  players: CreatePlayerInput[],
): Promise<{ count: number; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { count: 0, error: "No client" };
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { count: 0, error: "Not authenticated" };
  const rows = players.map((p) => ({
    ...p,
    user_id: user.id,
    primary_positions: p.primary_positions ?? [],
    secondary_positions: p.secondary_positions ?? [],
    is_active: p.is_active ?? true,
  }));
  const { data, error } = await sb.from("players").insert(rows).select("id");
  if (error) return { count: 0, error: error.message };
  return { count: data?.length ?? 0 };
}

// ─── Lineups ─────────────────────────────────────────────────────────────────

export async function fetchLineups(): Promise<GameLineup[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("game_lineups")
    .select("*, team:teams(name), roster:rosters(name)")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });
  return (data as GameLineup[]) ?? [];
}

export async function createLineup(input: {
  name: string; team_id?: string | null; roster_id?: string | null;
  game_date?: string | null; notes?: string; inning_count?: number;
}): Promise<{ id: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb
    .from("game_lineups")
    .insert({ ...input, user_id: user.id, inning_count: input.inning_count ?? 6, is_archived: false })
    .select("id")
    .single();
  if (error || !data) return null;
  return { id: data.id };
}

export async function archiveLineup(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("game_lineups").update({ is_archived: true }).eq("id", id);
  return !error;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function fetchEvents(teamId?: string): Promise<TeamEvent[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb
    .from("events")
    .select("*, team:teams(name)")
    .eq("is_archived", false)
    .order("event_date", { ascending: true });
  if (teamId) q = q.eq("team_id", teamId);
  const { data } = await q;
  return (data as TeamEvent[]) ?? [];
}

export async function createEvent(input: {
  title: string; type: string; event_date: string;
  team_id?: string | null; opponent?: string; start_time?: string;
  location?: string; notes?: string;
}): Promise<{ id: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb
    .from("events")
    .insert({ ...input, user_id: user.id, is_archived: false })
    .select("id")
    .single();
  if (error || !data) return null;
  return { id: data.id };
}

export async function archiveEvent(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("events").update({ is_archived: true }).eq("id", id);
  return !error;
}
