"use client";

import { FileUp, Plus } from "lucide-react";
import { useState } from "react";
import { GcImportModal } from "@/components/import/gc-import-modal";
import { CreateRosterModal } from "@/components/rosters/create-roster-modal";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/constants/teams";

export function RostersPageToolbar({
  teams,
  defaultTeamId,
  importTeamId,
}: {
  teams: Team[];
  /** Pre-select this team in the create form when opening from a team page. */
  defaultTeamId?: string;
  /** When set, show an Import from GameChanger button scoped to this team. */
  importTeamId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [importKey, setImportKey] = useState(0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        onClick={() => {
          setDialogKey((k) => k + 1);
          setOpen(true);
        }}
      >
        <Plus className="h-4 w-4" />
        Create roster
      </Button>
      {importTeamId && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setImportKey((k) => k + 1);
            setImportOpen(true);
          }}
        >
          <FileUp className="h-4 w-4" />
          Import roster
        </Button>
      )}
      <CreateRosterModal
        key={`create-${dialogKey}`}
        teams={teams}
        defaultTeamId={defaultTeamId}
        open={open}
        onOpenChange={setOpen}
      />
      {importTeamId && (
        <GcImportModal
          key={`import-${importKey}`}
          teamId={importTeamId}
          open={importOpen}
          onOpenChange={setImportOpen}
        />
      )}
    </div>
  );
}
