"use client";

import { LayoutList } from "lucide-react";
import { useState } from "react";
import { CreateLineupModal } from "@/components/lineups/create-lineup-modal";
import type { Player, Roster, Team } from "@/lib/constants/teams";

type Props = {
  teamId: string;
  activeRosters: Roster[];
  rosterPlayersMap: Record<string, Player[]>;
  allTeams: Team[];
};

export function LineupActionCards({
  teamId, activeRosters, rosterPlayersMap, allTeams,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      {/* Create Lineup card */}
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-card p-4 text-center transition-all hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <LayoutList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Create Lineup</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Build a game lineup</p>
        </div>
      </button>

      {/* Controlled modal — no trigger button rendered inside */}
      <CreateLineupModal
        teamId={teamId}
        activeRosters={activeRosters}
        rosterPlayersMap={rosterPlayersMap}
        allTeams={allTeams}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
