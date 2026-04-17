"use client";

import { LayoutList, Sparkles } from "lucide-react";
import { useState } from "react";
import { CreateLineupModal } from "@/components/lineups/create-lineup-modal";
import { AiImportModal } from "@/components/import/ai-import-modal";
import { Button } from "@/components/ui/button";
import type { Player, Roster, Team } from "@/lib/constants/teams";

type Props = {
  teams:            Team[];
  rosters:          Roster[];
  rosterPlayersMap: Record<string, Player[]>;
  /** When set (e.g. on a team detail page), pre-select this team inside the modal. */
  initialTeamId?:   string;
};

export function LineupsPageToolbar({ teams, rosters, rosterPlayersMap, initialTeamId }: Props) {
  const [open,      setOpen]      = useState(false);
  const [aiOpen,    setAiOpen]    = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [aiKey,     setAiKey]     = useState(0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => { setAiKey((k) => k + 1); setAiOpen(true); }}
      >
        <Sparkles className="h-4 w-4" />
        AI Import
      </Button>
      <Button
        type="button"
        onClick={() => { setDialogKey((k) => k + 1); setOpen(true); }}
      >
        <LayoutList className="h-4 w-4" />
        Create lineup
      </Button>

      <CreateLineupModal
        key={dialogKey}
        initialTeamId={initialTeamId}
        allTeams={teams}
        allRosters={rosters}
        rosterPlayersMap={rosterPlayersMap}
        open={open}
        onOpenChange={setOpen}
      />
      <AiImportModal
        key={`ai-${aiKey}`}
        open={aiOpen}
        onOpenChange={setAiOpen}
        preselectedTeamId={initialTeamId}
      />
    </div>
  );
}
