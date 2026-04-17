import { ArrowLeft, LayoutList } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { LineupCardActions } from "@/components/lineups/lineup-card-actions";
import { LineupsArchivedSection } from "@/components/lineups/lineups-archived-section";
import { LineupsPageToolbar } from "@/components/lineups/lineups-page-toolbar";
import { RosterCardActions } from "@/components/rosters/roster-card-actions";
import { RostersArchivedSection } from "@/components/rosters/rosters-archived-section";
import { RostersPageToolbar } from "@/components/rosters/rosters-page-toolbar";
import { TeamCardActions } from "@/components/teams/team-card-actions";
import { TeamMembersPanel } from "@/components/teams/team-members-panel";
import { Badge } from "@/components/ui/badge";
import { SortableCardGrid } from "@/components/ui/sortable-card-grid";
import type { GameLineup, Player, Roster, Team } from "@/lib/constants/teams";
import { getUserTeamRole } from "@/lib/permissions";
import { ROLE_LABELS, type TeamRole } from "@/lib/constants/roles";
import { getTeamMembers, getPendingInvitations } from "@/app/actions/members";

type Props = { params: Promise<{ id: string }> };

export default async function TeamDetailPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  const { data: team } = await supabase.from("teams").select("*").eq("id", id).single();
  if (!team) notFound();

  const [
    { data: rosters },
    { data: allTeams },
    { data: lineups },
  ] = await Promise.all([
    supabase.from("rosters").select("*").eq("team_id", id).order("created_at", { ascending: false }),
    supabase.from("teams").select("*").order("name", { ascending: true }),
    supabase.from("game_lineups").select("*").eq("team_id", id).order("created_at", { ascending: false }),
  ]);

  // Fetch current user's role for this team
  const userRole: TeamRole = user
    ? ((await getUserTeamRole(supabase, user.id, id)) ?? "viewer")
    : "viewer";

  // Fetch team members (for members panel)
  const { data: teamMembers } = await getTeamMembers(id);
  const { data: pendingInvites } = await getPendingInvitations(id);

  const typedTeam     = team      as Team;
  const typedRosters  = (rosters  ?? []) as Roster[];
  const typedAllTeams = (allTeams ?? []) as Team[];
  const typedLineups  = (lineups  ?? []) as GameLineup[];

  // Split active / archived
  const activeRosters   = typedRosters.filter((r) => !r.is_archived);
  const archivedRosters = typedRosters.filter((r) =>  r.is_archived);
  const activeLineups   = typedLineups.filter((l) => !l.is_archived);
  const archivedLineups = typedLineups.filter((l) =>  l.is_archived);

  // Active rosters for lineup creation
  const rosterActiveOnly = activeRosters.filter((r) => r.is_active);
  const rosterActiveIds  = rosterActiveOnly.map((r) => r.id);

  // Pre-fetch players for active rosters
  const rosterPlayersMap: Record<string, Player[]> = {};
  if (rosterActiveIds.length > 0) {
    const { data: allActivePlayers } = await supabase
      .from("players")
      .select("*")
      .in("roster_id", rosterActiveIds)
      .order("last_name",  { ascending: true })
      .order("first_name", { ascending: true });

    for (const p of (allActivePlayers ?? []) as Player[]) {
      if (!rosterPlayersMap[p.roster_id]) rosterPlayersMap[p.roster_id] = [];
      rosterPlayersMap[p.roster_id].push(p);
    }
  }

  // Roster name lookup for lineup cards
  const rosterNameMap: Record<string, string> = {};
  for (const r of typedRosters) rosterNameMap[r.id] = r.name;

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      {/* Back link */}
      <Link href="/teams"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        All teams
      </Link>

      {/* Team header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{typedTeam.name}</h1>
            <Badge variant={typedTeam.is_archived ? "muted" : typedTeam.is_active ? "success" : "muted"}>
              {typedTeam.is_archived ? "Archived" : typedTeam.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Your role: {ROLE_LABELS[userRole]}
            </Badge>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {[typedTeam.year, typedTeam.season, typedTeam.division, typedTeam.age_group, typedTeam.team_type]
              .filter(Boolean).join(" · ")}
            {typedTeam.organization && <> &mdash; {typedTeam.organization}</>}
          </p>
        </div>
        <div className="shrink-0">
          <TeamCardActions team={typedTeam} />
        </div>
      </div>

      {/* ── Rosters ──────────────────────────────────────── */}
      <div className="mb-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Rosters</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Batting rosters for this team. Create new or import from GameChanger.
            </p>
          </div>
          <RostersPageToolbar
            key={id}
            teams={typedAllTeams}
            defaultTeamId={id}
            importTeamId={id}
          />
        </div>

        {typedRosters.length === 0 && (
          <p className="mb-4 text-sm text-muted-foreground">
            No rosters yet. Use the buttons above to create one or import from GameChanger.
          </p>
        )}

        <SortableCardGrid
          storageKey={`rosters-${id}`}
          items={activeRosters.map((roster) => ({
            id:   roster.id,
            node: <RosterCard roster={roster} teamId={id} allTeams={typedAllTeams} />,
          }))}
        />

        <RostersArchivedSection rosters={archivedRosters} teamId={id} teams={typedAllTeams} />
      </div>

      {/* ── Game Lineups ──────────────────────────────────── */}
      <div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Game Lineups</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Game-specific lineups and batting orders.
            </p>
          </div>
          <LineupsPageToolbar
            key={id}
            teams={typedAllTeams}
            rosters={typedRosters.filter((r) => !r.is_archived)}
            rosterPlayersMap={rosterPlayersMap}
            initialTeamId={id}
          />
        </div>

        {typedLineups.length === 0 && (
          <p className="mb-4 text-sm text-muted-foreground">
            No lineups yet. Use the button above to create your first game lineup.
          </p>
        )}

        <SortableCardGrid
          storageKey={`lineups-${id}`}
          items={activeLineups.map((lineup) => ({
            id:   lineup.id,
            node: (
              <LineupCard
                lineup={lineup}
                rosterName={lineup.roster_id ? rosterNameMap[lineup.roster_id] : undefined}
                activeRosters={rosterActiveOnly}
                rosterPlayersMap={rosterPlayersMap}
              />
            ),
          }))}
        />

        <LineupsArchivedSection
          lineups={archivedLineups}
          rosterNameMap={rosterNameMap}
          activeRosters={rosterActiveOnly}
          rosterPlayersMap={rosterPlayersMap}
        />
      </div>

      {/* ── Team Members ──────────────────────────────────────── */}
      <div className="mt-12 border-t border-border pt-10">
        <TeamMembersPanel
          teamId={id}
          members={teamMembers ?? []}
          pendingInvitations={pendingInvites ?? []}
          currentRole={userRole}
        />
      </div>
    </div>
  );
}

// ─── Roster card ──────────────────────────────────────────────────────────────

function RosterCard({ roster, teamId, allTeams }: { roster: Roster; teamId: string; allTeams: Team[] }) {
  return (
    <div className="group relative flex h-full min-h-0 flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
      {/* Full-card link — sits beneath the action buttons */}
      <Link href={`/rosters/${teamId}/${roster.id}`} className="absolute inset-0 rounded-lg" />

      <div className="flex shrink-0 items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
          {roster.name}
        </h3>
        {/* z-10 lifts actions above the absolute link */}
        <div className="relative z-10 flex items-center gap-1">
          <Badge variant={roster.is_active ? "success" : "muted"}>
            {roster.is_active ? "Active" : "Inactive"}
          </Badge>
          <RosterCardActions roster={roster} teams={allTeams} />
        </div>
      </div>
      <p className="shrink-0 text-xs text-muted-foreground">
        {[roster.year, roster.season].filter(Boolean).join(" · ")}
      </p>
      <div className="flex min-h-0 flex-1 flex-col">
        {roster.notes && (
          <p className="text-xs text-muted-foreground line-clamp-2">{roster.notes}</p>
        )}
      </div>
    </div>
  );
}

// ─── Lineup card ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function LineupCard({
  lineup, rosterName, activeRosters, rosterPlayersMap,
}: {
  lineup: GameLineup;
  rosterName?: string;
  activeRosters: Roster[];
  rosterPlayersMap: Record<string, Player[]>;
}) {
  return (
    <div className="group relative flex h-full min-h-0 flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
      <Link href={`/lineups/${lineup.id}`} className="absolute inset-0 rounded-lg" />
      <div className="flex shrink-0 items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
          {lineup.name}
        </h3>
        <div className="relative z-10">
          <LineupCardActions
            lineup={lineup}
            activeRosters={activeRosters}
            rosterPlayersMap={rosterPlayersMap}
          />
        </div>
      </div>
      <p className="shrink-0 text-xs text-muted-foreground">
        {[
          lineup.game_date ? formatDate(lineup.game_date) : null,
          rosterName ?? null,
        ].filter(Boolean).join(" · ")}
      </p>
      <div className="flex min-h-0 flex-1 flex-col">
        {lineup.notes && (
          <p className="text-xs text-muted-foreground line-clamp-2">{lineup.notes}</p>
        )}
      </div>
      <div className="mt-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <LayoutList className="h-3 w-3" />
        {lineup.inning_count} innings
      </div>
    </div>
  );
}
