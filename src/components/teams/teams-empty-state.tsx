"use client";

import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { CreateTeamWizardModal } from "@/components/teams/create-team-wizard-modal";
import { Button } from "@/components/ui/button";

export function TeamsEmptyState() {
  const [open, setOpen] = useState(false);
  const [key,  setKey]  = useState(0);

  function handleOpen() {
    setKey((k) => k + 1);
    setOpen(true);
  }

  return (
    <>
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Users className="h-7 w-7 text-muted-foreground/60" />
        </div>
        <div>
          <p className="font-semibold">No teams yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first team manually, import from a spreadsheet, or let AI do the heavy lifting.
          </p>
        </div>
        <Button onClick={handleOpen}>
          <Plus className="mr-2 h-4 w-4" />
          Create your first team
        </Button>
      </div>

      <CreateTeamWizardModal key={key} open={open} onOpenChange={setOpen} />
    </>
  );
}
