"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateTeamWizardModal } from "@/components/teams/create-team-wizard-modal";
import { Button } from "@/components/ui/button";

export function TeamsPageToolbar() {
  const [open, setOpen] = useState(false);
  const [key,  setKey]  = useState(0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        onClick={() => { setKey((k) => k + 1); setOpen(true); }}
      >
        <Plus className="h-4 w-4" />
        Create team
      </Button>
      <CreateTeamWizardModal key={key} open={open} onOpenChange={setOpen} />
    </div>
  );
}
