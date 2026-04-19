"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { AddPlayerWizardModal } from "@/components/players/add-player-wizard-modal";
import { Button } from "@/components/ui/button";
import type { Player } from "@/lib/constants/teams";

type Props = {
  teamId: string;
  rosterId: string;
  existingPlayers: Player[];
};

export function AddPlayerWizardToolbar({ teamId, rosterId, existingPlayers }: Props) {
  const [open, setOpen] = useState(false);
  const [key,  setKey]  = useState(0);

  return (
    <>
      <Button
        type="button"
        onClick={() => { setKey((k) => k + 1); setOpen(true); }}
      >
        <UserPlus className="h-4 w-4" />
        Add player
      </Button>
      <AddPlayerWizardModal
        key={key}
        rosterId={rosterId}
        teamId={teamId}
        existingPlayers={existingPlayers}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
