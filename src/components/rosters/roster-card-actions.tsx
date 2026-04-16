"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setRosterArchived } from "@/app/actions/rosters";
import { DeleteRosterModal } from "@/components/rosters/delete-roster-modal";
import { EditRosterModal } from "@/components/rosters/edit-roster-modal";
import { Button } from "@/components/ui/button";
import type { Roster, Team } from "@/lib/constants/teams";

export function RosterCardActions({ roster, teams }: { roster: Roster; teams: Team[] }) {
  const router = useRouter();
  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleArchiveToggle() {
    startTransition(async () => {
      await setRosterArchived(roster.id, roster.team_id ?? null, !roster.is_archived);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => setEditOpen(true)} title="Edit roster">
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Edit</span>
        </Button>

        <Button variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={handleArchiveToggle} disabled={isPending}
          title={roster.is_archived ? "Unarchive roster" : "Archive roster"}>
          {roster.is_archived
            ? <ArchiveRestore className="h-3.5 w-3.5" />
            : <Archive       className="h-3.5 w-3.5" />}
          <span className="sr-only">{roster.is_archived ? "Unarchive" : "Archive"}</span>
        </Button>

        <Button variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)} title="Delete roster">
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>

      <EditRosterModal   roster={roster} teams={teams} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteRosterModal roster={roster} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
