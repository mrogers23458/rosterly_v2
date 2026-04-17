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
  event:       TeamEvent;
  teams:       Team[];
  rosters:     Roster[];
  lineups:     GameLineup[];
  redirectAfterDelete?: string;
};

export function EventCardActions({ event, teams, rosters, lineups, redirectAfterDelete }: Props) {
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
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => setEditOpen(true)}
          title="Edit event"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Edit</span>
        </Button>

        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={handleArchiveToggle}
          disabled={isPending}
          title={event.is_archived ? "Unarchive event" : "Archive event"}
        >
          {event.is_archived
            ? <ArchiveRestore className="h-3.5 w-3.5" />
            : <Archive        className="h-3.5 w-3.5" />}
          <span className="sr-only">{event.is_archived ? "Unarchive" : "Archive"}</span>
        </Button>

        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          title="Delete event"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">Delete</span>
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
        redirectTo={redirectAfterDelete}
      />
    </>
  );
}
