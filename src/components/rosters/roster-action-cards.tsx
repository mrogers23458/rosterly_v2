"use client";

import { FileUp, Plus } from "lucide-react";
import { useState } from "react";
import { GcImportModal } from "@/components/import/gc-import-modal";
import { CreateRosterModal } from "@/components/rosters/create-roster-modal";
import type { Team } from "@/lib/constants/teams";

type Props = {
  teams: Team[];
  defaultTeamId: string;
};

export function RosterActionCards({ teams, defaultTeamId }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <>
      {/* Create Roster card */}
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-card p-4 text-center transition-all hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Plus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Create Roster</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Add a new roster</p>
        </div>
      </button>

      {/* Import from GameChanger card */}
      <button
        type="button"
        onClick={() => setImportOpen(true)}
        className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-card p-4 text-center transition-all hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <FileUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Import from GameChanger</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Upload a CSV export</p>
        </div>
      </button>

      {/* Controlled modals — no trigger buttons rendered inside */}
      <CreateRosterModal
        teams={teams}
        defaultTeamId={defaultTeamId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <GcImportModal
        teamId={defaultTeamId}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </>
  );
}
