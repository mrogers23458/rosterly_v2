import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { StatsBrowser } from "@/components/stats/stats-browser";
import type { Player, Roster, Team } from "@/lib/constants/teams";
import type { PlayerGameStat } from "@/app/actions/player-stats";

export type AggregatedPlayerStat = {
  player_id:       string;
  first_name:      string;
  last_name:       string;
  jersey_number:   string | null;
  roster_id:       string | null;
  roster_name:     string;
  team_id:         string | null;
  team_name:       string;
  entries:         number;
  // Batting
  at_bats:         number;
  hits:            number;
  doubles:         number;
  triples:         number;
  home_runs:       number;
  rbi:             number;
  runs:            number;
  walks:           number;
  strikeouts_bat:  number;
  stolen_bases:    number;
  hit_by_pitch:    number;
  // Pitching
  innings_pitched: number;
  earned_runs:     number;
  strikeouts_pit:  number;
  walks_allowed:   number;
  // Fielding
  putouts:         number;
  assists:         number;
  errors:          number;
};

export default async function StatsPage() {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const [
    { data: teamsRaw },
    { data: rostersRaw },
  ] = await Promise.all([
    supabase.from("teams").select("*").eq("is_archived", false).order("name"),
    supabase.from("rosters").select("*").eq("is_archived", false).order("name"),
  ]);

  const teams   = (teamsRaw   ?? []) as Team[];
  const rosters = (rostersRaw ?? []) as Roster[];

  const rosterIds = rosters.map((r) => r.id);

  let players: Player[] = [];
  if (rosterIds.length > 0) {
    const { data: rows } = await supabase
      .from("players")
      .select("*")
      .in("roster_id", rosterIds)
      .order("last_name")
      .order("first_name");
    players = (rows ?? []) as Player[];
  }

  const playerIds = players.map((p) => p.id);

  let rawStats: PlayerGameStat[] = [];
  if (playerIds.length > 0) {
    const { data: statRows } = await supabase
      .from("player_game_stats")
      .select("*")
      .in("player_id", playerIds);
    rawStats = (statRows ?? []) as PlayerGameStat[];
  }

  // ── Build lookup maps ──────────────────────────────────────────────────────
  const rosterMap  = new Map(rosters.map((r) => [r.id, r]));
  const teamMap    = new Map(teams.map((t) => [t.id, t]));

  // ── Aggregate stats per player ────────────────────────────────────────────
  const statsByPlayer = new Map<string, PlayerGameStat[]>();
  for (const s of rawStats) {
    const arr = statsByPlayer.get(s.player_id) ?? [];
    arr.push(s);
    statsByPlayer.set(s.player_id, arr);
  }

  const aggregated: AggregatedPlayerStat[] = players
    .filter((p) => statsByPlayer.has(p.id))
    .map((p) => {
      const entries = statsByPlayer.get(p.id)!;
      const roster  = p.roster_id ? rosterMap.get(p.roster_id) : undefined;
      const team    = roster?.team_id ? teamMap.get(roster.team_id) : undefined;

      const sum = (key: keyof PlayerGameStat) =>
        entries.reduce((acc, e) => acc + (Number(e[key]) || 0), 0);

      return {
        player_id:       p.id,
        first_name:      p.first_name,
        last_name:       p.last_name,
        jersey_number:   p.jersey_number ?? null,
        roster_id:       p.roster_id ?? null,
        roster_name:     roster?.name ?? "—",
        team_id:         team?.id ?? null,
        team_name:       team?.name ?? "—",
        entries:         entries.length,
        at_bats:         sum("at_bats"),
        hits:            sum("hits"),
        doubles:         sum("doubles"),
        triples:         sum("triples"),
        home_runs:       sum("home_runs"),
        rbi:             sum("rbi"),
        runs:            sum("runs"),
        walks:           sum("walks"),
        strikeouts_bat:  sum("strikeouts_bat"),
        stolen_bases:    sum("stolen_bases"),
        hit_by_pitch:    sum("hit_by_pitch"),
        innings_pitched: sum("innings_pitched"),
        earned_runs:     sum("earned_runs"),
        strikeouts_pit:  sum("strikeouts_pit"),
        walks_allowed:   sum("walks_allowed"),
        putouts:         sum("putouts"),
        assists:         sum("assists"),
        errors:          sum("errors"),
      };
    });

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Stats</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Season statistics across all your players and teams.
        </p>
      </div>

      <StatsBrowser
        aggregated={aggregated}
        teams={teams}
        rosters={rosters}
        players={players}
      />
    </div>
  );
}
