"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { AddPlayerModal } from "@/components/players/add-player-modal";
import { Button } from "@/components/ui/button";
import type { Roster, Team } from "@/lib/constants/teams";

export function PlayersPageToolbar({ teams, rosters }: { teams: Team[]; rosters: Roster[] }) {
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setDialogKey((k) => k + 1);
          setOpen(true);
        }}
      >
        <UserPlus className="h-4 w-4" />
        Add player
      </Button>
      <AddPlayerModal
        key={dialogKey}
        directory
        teams={teams}
        rosters={rosters}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
