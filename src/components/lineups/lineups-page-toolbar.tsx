"use client";

import { LayoutList } from "lucide-react";
import { useState } from "react";
import { CreateLineupWizardModal } from "@/components/lineups/create-lineup-wizard-modal";
import { Button } from "@/components/ui/button";
import type { Player, Roster, Team } from "@/lib/constants/teams";

type Props = {
  teams:            Team[];
  rosters:          Roster[];
  rosterPlayersMap: Record<string, Player[]>;
  initialTeamId?:   string;
  canCreate?:       boolean;
  canImport?:       boolean;
};

export function LineupsPageToolbar({
  teams,
  rosters,
  rosterPlayersMap,
  initialTeamId,
  canCreate = true,
}: Props) {
  const [open,      setOpen]      = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  if (!canCreate) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        onClick={() => { setDialogKey((k) => k + 1); setOpen(true); }}
      >
        <LayoutList className="h-4 w-4" />
        Create lineup
      </Button>

      <CreateLineupWizardModal
        key={dialogKey}
        initialTeamId={initialTeamId}
        allTeams={teams}
        allRosters={rosters}
        rosterPlayersMap={rosterPlayersMap}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
