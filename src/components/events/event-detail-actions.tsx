"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setEventArchived } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogBody, DialogContent,
  DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { DeleteEventModal } from "@/components/events/delete-event-modal";
import { EditEventModal }   from "@/components/events/edit-event-modal";
import type { TeamEvent } from "@/lib/constants/events";
import type { GameLineup, Roster, Team } from "@/lib/constants/teams";

type Scope = "this" | "all";

type Props = {
  event:   TeamEvent;
  teams:   Team[];
  rosters: Roster[];
  lineups: GameLineup[];
};

export function EventDetailActions({ event, teams, rosters, lineups }: Props) {
  const router = useRouter();
  const isRecurring = Boolean(event.recurrence_group_id);

  const [editOpen,    setEditOpen]    = useState(false);
  const [deleteOpen,  setDeleteOpen]  = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveScope, setArchiveScope] = useState<Scope>("this");
  const [isPending, startTransition]  = useTransition();

  function handleArchiveClick() {
    if (isRecurring) {
      setArchiveScope("this");
      setArchiveOpen(true);
    } else {
      startTransition(async () => {
        await setEventArchived(event.id, !event.is_archived, "this");
        router.refresh();
      });
    }
  }

  function handleArchiveConfirm() {
    startTransition(async () => {
      await setEventArchived(event.id, !event.is_archived, archiveScope);
      setArchiveOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>

        <Button
          variant="outline" size="sm"
          onClick={handleArchiveClick}
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

      {/* Archive scope dialog — only shown for recurring events */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{event.is_archived ? "Unarchive" : "Archive"} event</DialogTitle>
            <DialogDescription>
              This is a recurring event. Which events do you want to {event.is_archived ? "unarchive" : "archive"}?
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="mb-4 flex flex-col gap-2">
              {(["this", "all"] as Scope[]).map((s) => (
                <label
                  key={s}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    archiveScope === s
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="archive-scope-detail"
                    value={s}
                    checked={archiveScope === s}
                    onChange={() => setArchiveScope(s)}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {s === "this" ? "Just this event" : "All events in this series"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s === "this"
                        ? "Only this occurrence will be affected."
                        : "Every event in the series will be affected."}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setArchiveOpen(false)}>Cancel</Button>
              <Button onClick={handleArchiveConfirm} disabled={isPending}>
                {event.is_archived ? "Unarchive" : "Archive"}{archiveScope === "all" ? " all" : ""}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
