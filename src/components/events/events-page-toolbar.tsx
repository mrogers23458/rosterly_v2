"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateEventModal } from "@/components/events/create-event-modal";
import { Button } from "@/components/ui/button";
import type { GameLineup, Roster, Team } from "@/lib/constants/teams";

type Props = {
  teams:   Team[];
  rosters: Roster[];
  lineups: GameLineup[];
};

export function EventsPageToolbar({ teams, rosters, lineups }: Props) {
  const [open, setOpen] = useState(false);
  const [key,  setKey]  = useState(0);

  function handleOpen() {
    setKey((k) => k + 1);
    setOpen(true);
  }

  return (
    <>
      <Button onClick={handleOpen}>
        <Plus className="mr-2 h-4 w-4" />
        Create event
      </Button>

      <CreateEventModal
        key={key}
        open={open}
        onOpenChange={setOpen}
        teams={teams}
        rosters={rosters}
        lineups={lineups}
      />
    </>
  );
}
