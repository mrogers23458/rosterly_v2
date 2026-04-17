"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setEventArchived } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { DeleteEventModal } from "@/components/events/delete-event-modal";
import { EditEventModal } from "@/components/events/edit-event-modal";
import type { TeamEvent } from "@/lib/constants/events";
import type { GameLineup, Roster, Team } from "@/lib/constants/teams";

type Props = {
  event:   TeamEvent;
  teams:   Team[];
  rosters: Roster[];
  lineups: GameLineup[];
};

export function EventDetailActions({ event, teams, rosters, lineups }: Props) {
  const router = useRouter();
  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending,  startTransition] = useTransition();

  function handleArchiveToggle() {
    startTransition(async () => {
      await setEventArchived(event.id, !event.is_archived);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline" size="sm"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>

        <Button
          variant="outline" size="sm"
          onClick={handleArchiveToggle}
          disabled={isPending}
        >
          {event.is_archived
            ? <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />
            : <Archive        className="mr-1.5 h-3.5 w-3.5" />}
          {event.is_archived ? "Unarchive" : "Archive"}
        </Button>

        <Button
          variant="outline" size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <EditEventModal
        key={`edit-${event.id}-${String(editOpen)}`}
        event={event}
        open={editOpen}
        onOpenChange={setEditOpen}
        teams={teams}
        rosters={rosters}
        lineups={lineups}
      />
      <DeleteEventModal
        event={event}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        redirectTo="/events"
      />
    </>
  );
}
