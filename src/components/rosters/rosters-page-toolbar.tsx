"use client";

import { FileUp, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { AiImportModal } from "@/components/import/ai-import-modal";
import { GcImportModal } from "@/components/import/gc-import-modal";
import { CreateRosterModal } from "@/components/rosters/create-roster-modal";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/constants/teams";

export function RostersPageToolbar({
  teams,
  writableTeams,
  defaultTeamId,
  importTeamId,
  canCreate = true,
  canImport = true,
}: {
  teams: Team[];
  /** Teams the user can actually write rosters to (for create modal dropdown). */
  writableTeams?: Team[];
  defaultTeamId?: string;
  importTeamId?: string;
  canCreate?: boolean;
  canImport?: boolean;
}) {
  const [open,       setOpen]       = useState(false);
  const [aiOpen,     setAiOpen]     = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [aiKey,     setAiKey]     = useState(0);
  const [importKey, setImportKey] = useState(0);

  if (!canCreate && !canImport) return null;

  const teamsForCreate = writableTeams ?? teams;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canCreate && (
        <Button
          type="button"
          onClick={() => { setDialogKey((k) => k + 1); setOpen(true); }}
        >
          <Plus className="h-4 w-4" />
          Create roster
        </Button>
      )}
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
      {canImport && importTeamId && (
        <Button
          type="button"
          variant="outline"
          onClick={() => { setImportKey((k) => k + 1); setImportOpen(true); }}
        >
          <FileUp className="h-4 w-4" />
          Import roster
        </Button>
      )}

      {canCreate && (
        <CreateRosterModal
          key={`create-${dialogKey}`}
          teams={teamsForCreate}
          defaultTeamId={defaultTeamId}
          open={open}
          onOpenChange={setOpen}
        />
      )}
      {canImport && (
        <AiImportModal
          key={`ai-${aiKey}`}
          open={aiOpen}
          onOpenChange={setAiOpen}
          preselectedTeamId={defaultTeamId}
        />
      )}
      {canImport && importTeamId && (
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
