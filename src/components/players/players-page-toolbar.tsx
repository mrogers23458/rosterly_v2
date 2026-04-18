"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { AddPlayerModal } from "@/components/players/add-player-modal";
import { Button } from "@/components/ui/button";
import type { Roster, Team } from "@/lib/constants/teams";

export function PlayersPageToolbar({
  teams,
  rosters,
  writableRosters,
  canCreate = true,
}: {
  teams: Team[];
  rosters: Roster[];
  /** Rosters filtered to teams where user has player:create. */
  writableRosters?: Roster[];
  canCreate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  if (!canCreate) return null;

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
        rosters={writableRosters ?? rosters}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
