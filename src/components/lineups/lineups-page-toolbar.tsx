"use client";

import { LayoutList } from "lucide-react";
import { useMemo, useState } from "react";
import { CreateLineupModal } from "@/components/lineups/create-lineup-modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Player, Roster, Team } from "@/lib/constants/teams";

type Props = {
  teams: Team[];
  rosters: Roster[];
  rosterPlayersMap: Record<string, Player[]>;
  /** When set (e.g. on a team detail page), pre-select this team in the dropdown. */
  initialTeamId?: string;
};

export function LineupsPageToolbar({ teams, rosters, rosterPlayersMap, initialTeamId }: Props) {
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const teamOptions = useMemo(() => teams.filter((t) => !t.is_archived), [teams]);
  const [teamId, setTeamId] = useState(() => {
    if (initialTeamId && teamOptions.some((t) => t.id === initialTeamId)) return initialTeamId;
    return teamOptions[0]?.id ?? "";
  });

  const activeRostersForTeam = useMemo(
    () => rosters.filter((r) => r.team_id === teamId && r.is_active && !r.is_archived),
    [rosters, teamId],
  );

  const rosterPlayersSlice = useMemo(() => {
    const out: Record<string, Player[]> = {};
    for (const r of activeRostersForTeam) {
      out[r.id] = rosterPlayersMap[r.id] ?? [];
    }
    return out;
  }, [activeRostersForTeam, rosterPlayersMap]);

  if (teamOptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Create a team first to add lineups.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <div className="flex flex-col gap-1 sm:min-w-[220px]">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Team for new lineup
        </span>
        <Select
          aria-label="Team for new lineup"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          {teamOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.year ? ` (${t.year})` : ""}
            </option>
          ))}
        </Select>
      </div>
      <Button
        type="button"
        className="shrink-0"
        onClick={() => {
          setDialogKey((k) => k + 1);
          setOpen(true);
        }}
      >
        <LayoutList className="h-4 w-4" />
        Create lineup
      </Button>
      <CreateLineupModal
        key={dialogKey}
        teamId={teamId}
        activeRosters={activeRostersForTeam}
        rosterPlayersMap={rosterPlayersSlice}
        allTeams={teams}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
