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
  canImport = true,
}: Props) {
  const [open,      setOpen]      = useState(false);
  const [aiOpen,    setAiOpen]    = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [aiKey,     setAiKey]     = useState(0);

  if (!canCreate && !canImport) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canImport && (
        <Button
          type="button"
          variant="outline"
          onClick={() => { setAiKey((k) => k + 1); setAiOpen(true); }}
        >
          <Sparkles className="h-4 w-4" />
          AI Import
        </Button>
      )}
      {canCreate && (
        <Button
          type="button"
          onClick={() => { setDialogKey((k) => k + 1); setOpen(true); }}
        >
          <LayoutList className="h-4 w-4" />
          Create lineup
        </Button>
      )}

      {canCreate && (
        <CreateLineupModal
          key={dialogKey}
          initialTeamId={initialTeamId}
          allTeams={teams}
          allRosters={rosters}
          rosterPlayersMap={rosterPlayersMap}
          open={open}
          onOpenChange={setOpen}
        />
      )}
      {canImport && (
        <AiImportModal
          key={`ai-${aiKey}`}
          open={aiOpen}
          onOpenChange={setAiOpen}
          preselectedTeamId={initialTeamId}
        />
      )}
    </div>
  );
}
