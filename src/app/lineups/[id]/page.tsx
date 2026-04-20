import { ArrowLeft, CalendarDays, LayoutList, Users } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { LineupDetailActions } from "@/components/lineups/lineup-detail-actions";
import { LineupGamedayBar } from "@/components/lineups/lineup-gameday-bar";
import { LineupViewTable } from "@/components/lineups/lineup-view-table";
import { Badge } from "@/components/ui/badge";
import { getUserTeamRole } from "@/lib/permissions";
import type { TeamRole } from "@/lib/constants/roles";
import type { GameLineup, LineupEntry, Player, Roster, Team } from "@/lib/constants/teams";

type Props = { params: Promise<{ id: string }> };

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function LineupDetailPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch the lineup
  const { data: lineupRaw } = await supabase
    .from("game_lineups")
    .select("*")
    .eq("id", id)
    .single();

  if (!lineupRaw) notFound();
  const lineup = lineupRaw as GameLineup;

  // Fetch entries, team, and roster in parallel
  const [
    { data: entriesRaw },
    { data: teamRaw },
    { data: rosterRaw },
    { data: activeRostersRaw },
  ] = await Promise.all([
    supabase
      .from("lineup_entries")
      .select("*")
      .eq("lineup_id", id)
      .order("batting_order", { ascending: true }),
    lineup.team_id
      ? supabase.from("teams").select("*").eq("id", lineup.team_id).single()
      : Promise.resolve({ data: null }),
    lineup.roster_id
      ? supabase.from("rosters").select("*").eq("id", lineup.roster_id).single()
      : Promise.resolve({ data: null }),
    lineup.team_id
      ? supabase
          .from("rosters")
          .select("*")
          .eq("team_id", lineup.team_id)
          .eq("is_active", true)
          .eq("is_archived", false)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const entries       = (entriesRaw     ?? []) as LineupEntry[];
  const team          = teamRaw         as Team | null;
  const roster        = rosterRaw       as Roster | null;
  const activeRosters = (activeRostersRaw ?? []) as Roster[];

  const { data: { user } } = await supabase.auth.getUser();
  const userRole: TeamRole = (user && lineup.team_id)
    ? ((await getUserTeamRole(supabase, user.id, lineup.team_id)) ?? "viewer")
    : "viewer";

  // Build players map for edit modal
  const rosterPlayersMap: Record<string, Player[]> = {};
  const activeRosterIds = activeRosters.map((r) => r.id);
  if (activeRosterIds.length > 0) {
    const { data: allPlayers } = await supabase
      .from("players")
      .select("*")
      .in("roster_id", activeRosterIds)
      .order("last_name",  { ascending: true })
      .order("first_name", { ascending: true });

    for (const p of (allPlayers ?? []) as Player[]) {
      if (!rosterPlayersMap[p.roster_id]) rosterPlayersMap[p.roster_id] = [];
      rosterPlayersMap[p.roster_id].push(p);
    }
  }

  const isPast = lineup.game_date
    ? new Date(lineup.game_date + "T00:00:00") < new Date(new Date().toDateString())
    : false;

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      {/* Back link */}
      <Link
        href={lineup.team_id ? `/teams/${lineup.team_id}` : "/lineups"}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {team ? team.name : "Game Lineups"}
      </Link>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {lineup.name}
            </h1>
            {lineup.is_archived && <Badge variant="muted">Archived</Badge>}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {lineup.game_date && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span className={isPast ? "line-through opacity-60" : ""}>
                  {formatDate(lineup.game_date)}
                </span>
              </span>
            )}
            {team && (
              <span className="flex items-center gap-1.5">
                <LayoutList className="h-3.5 w-3.5 shrink-0" />
                {team.name}
              </span>
            )}
            {roster && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 shrink-0" />
                {roster.name}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <LayoutList className="h-3.5 w-3.5 shrink-0" />
              {lineup.inning_count} inning{lineup.inning_count !== 1 ? "s" : ""}
            </span>
          </div>

          {lineup.notes && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{lineup.notes}</p>
          )}
        </div>

        <div className="shrink-0">
          <LineupDetailActions
            lineup={lineup}
            activeRosters={activeRosters}
            rosterPlayersMap={rosterPlayersMap}
            userRole={userRole}
          />
        </div>
      </div>

      {/* Gameday bar — print + share */}
      <LineupGamedayBar
        lineupId={lineup.id}
        shareToken={lineup.share_token}
        userRole={userRole}
      />

      {/* Lineup table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Batting order
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {entries.length} player{entries.length !== 1 ? "s" : ""}
            </span>
          </h2>
        </div>

        <LineupViewTable entries={entries} inningCount={lineup.inning_count} />
      </div>
    </div>
  );
}
