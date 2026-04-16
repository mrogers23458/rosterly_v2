"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setTeamArchived } from "@/app/actions/teams";
import { DeleteTeamModal } from "@/components/teams/delete-team-modal";
import { EditTeamModal } from "@/components/teams/edit-team-modal";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/constants/teams";

export function TeamCardActions({ team }: { team: Team }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleArchiveToggle() {
    startTransition(async () => {
      await setTeamArchived(team.id, !team.is_archived);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => setEditOpen(true)}
          title="Edit team"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Edit</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={handleArchiveToggle}
          disabled={isPending}
          title={team.is_archived ? "Unarchive team" : "Archive team"}
        >
          {team.is_archived ? (
            <ArchiveRestore className="h-3.5 w-3.5" />
          ) : (
            <Archive className="h-3.5 w-3.5" />
          )}
          <span className="sr-only">{team.is_archived ? "Unarchive" : "Archive"}</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          title="Delete team"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>

      <EditTeamModal team={team} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteTeamModal team={team} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
