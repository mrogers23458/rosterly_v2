"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateRosterWizardModal } from "@/components/rosters/create-roster-wizard-modal";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/constants/teams";

export function RostersPageToolbar({
  teams,
  writableTeams,
  defaultTeamId,
  canCreate = true,
}: {
  teams: Team[];
  /** Teams the user can actually write rosters to (for create modal dropdown). */
  writableTeams?: Team[];
  defaultTeamId?: string;
  /** importTeamId kept for API compatibility but no longer renders a separate import button. */
  importTeamId?: string;
  canCreate?: boolean;
  canImport?: boolean;
}) {
  const [open,      setOpen]      = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  if (!canCreate) return null;

  const teamsForCreate = writableTeams ?? teams;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        onClick={() => { setDialogKey((k) => k + 1); setOpen(true); }}
      >
        <Plus className="h-4 w-4" />
        Create roster
      </Button>

      <CreateRosterWizardModal
        key={dialogKey}
        teams={teamsForCreate}
        defaultTeamId={defaultTeamId}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
