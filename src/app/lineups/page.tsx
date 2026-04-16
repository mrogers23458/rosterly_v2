import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { LineupsPageToolbar } from "@/components/lineups/lineups-page-toolbar";
import { LineupBrowser } from "@/components/lineups/lineup-browser";
import type { GameLineup, Player, Roster, Team } from "@/lib/constants/teams";

export default async function LineupsPage() {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const [{ data: lineups }, { data: teams }, { data: rosters }] = await Promise.all([
    supabase
      .from("game_lineups")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("teams")
      .select("*")
      .eq("is_archived", false)
      .order("name", { ascending: true }),
    supabase
      .from("rosters")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
  ]);

  const rosterList = (rosters ?? []) as Roster[];
  const activeRosterIds = rosterList.filter((r) => r.is_active).map((r) => r.id);

  const rosterPlayersMap: Record<string, Player[]> = {};
  if (activeRosterIds.length > 0) {
    const { data: allPlayers } = await supabase
      .from("players")
      .select("*")
      .in("roster_id", activeRosterIds)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    for (const p of (allPlayers ?? []) as Player[]) {
      if (!rosterPlayersMap[p.roster_id]) rosterPlayersMap[p.roster_id] = [];
      rosterPlayersMap[p.roster_id].push(p);
    }
  }

  const typedTeams = (teams ?? []) as Team[];

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Game Lineups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All game lineups across your teams.
          </p>
        </div>
        <LineupsPageToolbar
          teams={typedTeams}
          rosters={rosterList}
          rosterPlayersMap={rosterPlayersMap}
        />
      </div>

      <LineupBrowser
        lineups={(lineups ?? []) as GameLineup[]}
        teams={typedTeams}
        rosters={rosterList}
        rosterPlayersMap={rosterPlayersMap}
      />
    </div>
  );
}
