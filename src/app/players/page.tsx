import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { PlayerBrowser } from "@/components/players/player-browser";
import { PlayersPageToolbar } from "@/components/players/players-page-toolbar";
import { getUserTeamRoles } from "@/lib/permissions";
import { can } from "@/lib/constants/roles";
import type { Player, Roster, Team } from "@/lib/constants/teams";

export default async function PlayersPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: teams }, { data: rosters }] = await Promise.all([
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
  const rosterIds  = rosterList.map((r) => r.id);

  let players: Player[] = [];
  if (rosterIds.length > 0) {
    const { data: playerRows } = await supabase
      .from("players")
      .select("*")
      .in("roster_id", rosterIds)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });
    players = (playerRows ?? []) as Player[];
  }

  const typedTeams = (teams ?? []) as Team[];
  const teamRoles  = user ? await getUserTeamRoles(supabase, user.id) : {};

  const canCreatePlayer = Object.values(teamRoles).some((r) => can(r, "player:create"));
  // Rosters on teams where the user can create/edit players
  const writableRosters = rosterList.filter(
    (r) => r.team_id && can(teamRoles[r.team_id], "player:create"),
  );

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Players</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All players on your rosters. Filter by team and roster, or search.
          </p>
        </div>
        <PlayersPageToolbar
          teams={typedTeams}
          rosters={rosterList}
          writableRosters={writableRosters}
          canCreate={canCreatePlayer}
        />
      </div>

      <PlayerBrowser
        players={players}
        rosters={rosterList}
        teams={typedTeams}
        teamRoles={teamRoles}
      />
    </div>
  );
}
