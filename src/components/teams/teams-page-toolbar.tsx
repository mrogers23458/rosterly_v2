"use client";

import { FileUp, Plus } from "lucide-react";
import { useState } from "react";
import { GcImportModal } from "@/components/import/gc-import-modal";
import { CreateTeamModal } from "@/components/teams/create-team-modal";
import { Button } from "@/components/ui/button";

export function TeamsPageToolbar() {
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const [importKey, setImportKey] = useState(0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        onClick={() => {
          setCreateKey((k) => k + 1);
          setCreateOpen(true);
        }}
      >
        <Plus className="h-4 w-4" />
        Create team
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setImportKey((k) => k + 1);
          setImportOpen(true);
        }}
      >
        <FileUp className="h-4 w-4" />
        Import from GameChanger
      </Button>
      <CreateTeamModal key={`create-${createKey}`} open={createOpen} onOpenChange={setCreateOpen} />
      <GcImportModal key={`import-${importKey}`} open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
