import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AddPlayerWizardToolbar } from "@/components/players/add-player-wizard-toolbar";
import { PlayerRowActions } from "@/components/players/player-row-actions";
import { Badge } from "@/components/ui/badge";
import { getUserTeamRole } from "@/lib/permissions";
import { can } from "@/lib/constants/roles";
import type { TeamRole } from "@/lib/constants/roles";
import type { Player, Roster, Team } from "@/lib/constants/teams";

type Props = {
  params: Promise<{ teamId: string; rosterId: string }>;
};

export default async function RosterDetailPage({ params }: Props) {
  const { teamId, rosterId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: roster }, { data: team }, { data: players }] = await Promise.all([
    supabase.from("rosters").select("*").eq("id", rosterId).single(),
    supabase.from("teams").select("*").eq("id", teamId).single(),
    supabase
      .from("players")
      .select("*")
      .eq("roster_id", rosterId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true }),
  ]);

  if (!roster || !team) notFound();

  const userRole: TeamRole = user
    ? ((await getUserTeamRole(supabase, user.id, teamId)) ?? "viewer")
    : "viewer";

  const canAddPlayer  = can(userRole, "player:create");
  const canImport     = can(userRole, "import:use");
  const typedRoster  = roster  as Roster;
  const typedTeam    = team    as Team;
  const typedPlayers = (players ?? []) as Player[];

  const activeCount   = typedPlayers.filter((p) => p.is_active).length;
  const inactiveCount = typedPlayers.filter((p) => !p.is_active).length;

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/teams" className="hover:text-foreground transition-colors">Teams</Link>
        <span>/</span>
        <Link href={`/teams/${teamId}`} className="hover:text-foreground transition-colors">
          {typedTeam.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{typedRoster.name}</span>
      </div>

      {/* Roster header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{typedRoster.name}</h1>
          <Badge variant={typedRoster.is_active ? "success" : "muted"}>
            {typedRoster.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {[typedRoster.year, typedRoster.season].filter(Boolean).join(" · ")}
          {" · "}
          <Link href={`/teams/${teamId}`} className="hover:text-foreground transition-colors">
            {typedTeam.name}
          </Link>
        </p>
      </div>

      {/* Players section */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Players</h2>
            {typedPlayers.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {activeCount} active{inactiveCount > 0 && `, ${inactiveCount} inactive`}
              </span>
            )}
          </div>
          {typedPlayers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {(canAddPlayer || canImport) && (
                <AddPlayerWizardToolbar
                  teamId={teamId}
                  rosterId={rosterId}
                  existingPlayers={typedPlayers}
                />
              )}
            </div>
          )}
        </div>

        {/* Empty state */}
        {typedPlayers.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="mb-1 font-semibold">No players yet</h3>
            {canAddPlayer ? (
              <>
                <p className="mb-5 text-sm text-muted-foreground">
                  Add players manually or import from AI, Google Sheets, or GameChanger.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <AddPlayerWizardToolbar
                    teamId={teamId}
                    rosterId={rosterId}
                    existingPlayers={typedPlayers}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No players have been added yet.</p>
            )}
          </div>
        )}

        {/* Player table */}
        {typedPlayers.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Age</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Positions</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Bats / Throws</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {typedPlayers.map((player) => (
                  <PlayerRow key={player.id} player={player} teamId={teamId} rosterId={rosterId} userRole={userRole} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function PlayerRow({ player, teamId, rosterId, userRole }: { player: Player; teamId: string; rosterId: string; userRole: TeamRole }) {
  const age = calculateAge(player.date_of_birth);
  const displayName = player.preferred_name
    ? `${player.first_name} "${player.preferred_name}" ${player.last_name}`
    : `${player.first_name} ${player.last_name}`;

  const allPrimary   = player.primary_positions ?? [];
  const allSecondary = player.secondary_positions ?? [];

  return (
    <tr className="bg-card hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 text-muted-foreground">
        {player.jersey_number ?? "—"}
      </td>
      <td className="px-4 py-3 font-medium">
          <a href={`/players/${player.id}`} className="inline-flex items-center gap-2 hover:text-primary transition-colors hover:underline">
            {player.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.image_url}
                alt={displayName}
                className="h-7 w-7 flex-shrink-0 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted text-[10px] font-bold text-muted-foreground">
                {player.first_name.charAt(0)}{player.last_name.charAt(0)}
              </span>
            )}
            {displayName}
          </a>
        </td>
      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
        {age !== null ? age : "—"}
      </td>
      <td className="hidden px-4 py-3 md:table-cell">
        {allPrimary.length > 0 ? (
          <span className="text-foreground">{allPrimary.join(", ")}</span>
        ) : null}
        {allSecondary.length > 0 ? (
          <span className="text-muted-foreground"> · {allSecondary.join(", ")}</span>
        ) : null}
        {allPrimary.length === 0 && allSecondary.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : null}
      </td>
      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
        {[player.bats, player.throws].filter(Boolean).join("/") || "—"}
      </td>
      <td className="px-4 py-3">
        <Badge variant={player.is_active ? "success" : "muted"}>
          {player.is_active ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <PlayerRowActions player={player} teamId={teamId} rosterId={rosterId} userRole={userRole} />
      </td>
    </tr>
  );
}
