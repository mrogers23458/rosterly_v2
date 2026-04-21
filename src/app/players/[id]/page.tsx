import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PlayerDetailHeader } from "@/components/players/player-detail-header";
import { PlayerPlaytimePanel } from "@/components/players/player-playtime-panel";
import { PlayerStatsPanel } from "@/components/players/player-stats-panel";
import { PlayerClaimButton } from "@/components/players/player-claim-button";
import { Badge } from "@/components/ui/badge";
import { getUserTeamRole } from "@/lib/permissions";
import { can } from "@/lib/constants/roles";
import type { TeamRole } from "@/lib/constants/roles";
import type { GameLineup, LineupEntry, Player, Roster, Team } from "@/lib/constants/teams";
import type { PlayerGameStat } from "@/app/actions/player-stats";
import type { LineupAppearance } from "@/components/players/player-playtime-panel";
import { getMyClaimForPlayer } from "@/app/actions/player-claims";

type Props = {
  params: Promise<{ id: string }>;
};

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

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function PlayerDetailPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  // ── 1. Load player ──────────────────────────────────────────────────────────
  const { data: playerRaw } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  if (!playerRaw) notFound();
  const player = playerRaw as Player;

  // ── 2. Load roster + team ───────────────────────────────────────────────────
  const { data: rosterRaw } = await supabase
    .from("rosters")
    .select("*")
    .eq("id", player.roster_id)
    .single();

  const roster = rosterRaw as Roster | null;
  const teamId = roster?.team_id ?? null;

  const { data: teamRaw } = teamId
    ? await supabase.from("teams").select("*").eq("id", teamId).single()
    : { data: null };

  const team = teamRaw as Team | null;

  // ── 3. Permissions ──────────────────────────────────────────────────────────
  const userRole: TeamRole | null = user && teamId
    ? (await getUserTeamRole(supabase, user.id, teamId)) ?? null
    : null;

  // ── 3b. Claim state ─────────────────────────────────────────────────────────
  // Load the current user's own claim (if any) and whether the player is already
  // claimed by a different user so we can show the appropriate UI.
  const { data: myClaim } = user ? await getMyClaimForPlayer(id) : { data: null };
  const claimedByUserId   = (player as Player & { claimed_by_user_id?: string | null }).claimed_by_user_id ?? null;
  const alreadyClaimed    = !!claimedByUserId && claimedByUserId !== user?.id;
  const isClaimer         = !!user && claimedByUserId === user.id;

  // A viewer who is the approved claimer gets player:edit capability.
  const canEditAsManager  = can(userRole, "player:edit");
  const effectiveCanEdit  = canEditAsManager || isClaimer;

  // ── 4. Load all lineups for the team (for stats modal picker) ───────────────
  const { data: lineupsRaw } = teamId
    ? await supabase
        .from("game_lineups")
        .select("*")
        .eq("team_id", teamId)
        .eq("is_archived", false)
        .order("game_date", { ascending: false })
        .order("created_at", { ascending: false })
    : { data: [] };

  const lineups = (lineupsRaw ?? []) as GameLineup[];

  // ── 5. Find lineup appearances ──────────────────────────────────────────────
  // lineup_entries are denormalized — match by jersey_number (primary) or player_name (fallback)
  const appearances: LineupAppearance[] = [];

  if (lineups.length > 0) {
    const lineupIds = lineups.map((l) => l.id);
    const { data: allEntries } = await supabase
      .from("lineup_entries")
      .select("*")
      .in("lineup_id", lineupIds);

    const entries = (allEntries ?? []) as LineupEntry[];
    const lineupMap = Object.fromEntries(lineups.map((l) => [l.id, l]));

    const playerFullName = `${player.first_name} ${player.last_name}`.toLowerCase().trim();

    for (const entry of entries) {
      // Primary match: jersey number (only when both sides have a value)
      const jerseyMatch = player.jersey_number
        && entry.jersey_number
        && player.jersey_number === entry.jersey_number;

      // Fallback: case-insensitive full name match
      const nameMatch = !jerseyMatch
        && entry.player_name.toLowerCase().trim() === playerFullName;

      if (jerseyMatch || nameMatch) {
        const lineup = lineupMap[entry.lineup_id];
        if (lineup) appearances.push({ lineup, entry });
      }
    }

    // Sort by game date descending
    appearances.sort((a, b) => {
      const da = a.lineup.game_date ?? "";
      const db = b.lineup.game_date ?? "";
      return db.localeCompare(da);
    });
  }

  // ── 6. Load game stats ──────────────────────────────────────────────────────
  const { data: statsRaw } = await supabase
    .from("player_game_stats")
    .select("*")
    .eq("player_id", id)
    .order("game_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const stats = (statsRaw ?? []) as PlayerGameStat[];

  // ── Derived display values ──────────────────────────────────────────────────
  const age = calculateAge(player.date_of_birth);
  const canView = can(userRole, "player:view") || !teamId; // unassigned players are always viewable

  if (!canView) notFound();

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/players" className="hover:text-foreground transition-colors">Players</Link>
        {team && (
          <>
            <span>/</span>
            <Link href={`/teams/${teamId}`} className="hover:text-foreground transition-colors">
              {team.name}
            </Link>
          </>
        )}
        {roster && (
          <>
            <span>/</span>
            <Link
              href={teamId ? `/rosters/${teamId}/${roster.id}` : "/players"}
              className="hover:text-foreground transition-colors"
            >
              {roster.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-foreground">
          {player.preferred_name?.trim() || `${player.first_name} ${player.last_name}`}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <PlayerDetailHeader
          player={player}
          teamId={teamId}
          rosterId={player.roster_id}
          userRole={userRole}
          canEdit={effectiveCanEdit}
        />

        {/* Claim button — shown for team members who can view but not edit */}
        {user && teamId && userRole && !canEditAsManager && !isClaimer && (
          <div className="mt-4">
            <PlayerClaimButton
              playerId={id}
              teamId={teamId}
              playerName={`${player.first_name} ${player.last_name}`}
              existingClaim={myClaim}
              alreadyClaimed={alreadyClaimed}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-8">
        {/* ── Bio / Info card ─────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-base font-semibold">Player Info</h2>
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 md:grid-cols-3">
            <InfoRow label="Team" value={team?.name ?? "—"} />
            <InfoRow label="Roster" value={roster?.name ?? "—"} />
            <InfoRow label="Jersey" value={player.jersey_number ? `#${player.jersey_number}` : "—"} />
            <InfoRow
              label="Date of birth"
              value={player.date_of_birth ? formatDate(player.date_of_birth) : "—"}
            />
            <InfoRow label="Age" value={age !== null ? `${age} years old` : "—"} />
            <InfoRow label="Uniform size" value={player.uniform_size ?? "—"} />
            {player.parent_guardian_name && (
              <InfoRow label="Guardian" value={player.parent_guardian_name} />
            )}
            {player.parent_guardian_email && (
              <InfoRow label="Guardian email" value={player.parent_guardian_email} />
            )}
            {player.parent_guardian_phone && (
              <InfoRow label="Guardian phone" value={player.parent_guardian_phone} />
            )}
          </div>
          {(player.medical_notes || player.notes) && (
            <div className="mt-3 flex flex-col gap-2">
              {player.medical_notes && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <span className="font-semibold">Medical / Allergy: </span>
                  {player.medical_notes}
                </div>
              )}
              {player.notes && (
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Notes: </span>
                  {player.notes}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Playtime ────────────────────────────────────────────────────── */}
        <PlayerPlaytimePanel appearances={appearances} />

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <PlayerStatsPanel
          playerId={id}
          stats={stats}
          lineups={lineups}
          userRole={userRole}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
