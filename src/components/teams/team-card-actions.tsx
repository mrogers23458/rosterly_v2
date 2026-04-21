"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setTeamArchived } from "@/app/actions/teams";
import { DeleteTeamModal } from "@/components/teams/delete-team-modal";
import { EditTeamModal } from "@/components/teams/edit-team-modal";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/constants/roles";
import type { TeamRole } from "@/lib/constants/roles";
import type { Team } from "@/lib/constants/teams";

export function TeamCardActions({
  team,
  userRole,
}: {
  team: Team;
  userRole?: TeamRole | null;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canEdit    = can(userRole, "team:edit");
  const canArchive = can(userRole, "team:archive");
  const canDelete  = can(userRole, "team:delete");

  if (!canEdit && !canArchive && !canDelete) return null;

  function handleArchiveToggle() {
    startTransition(async () => {
      await setTeamArchived(team.id, !team.is_archived);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {canEdit && (
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
        )}

        {canArchive && (
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
        )}

        {canDelete && (
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
        )}
      </div>

      {canEdit && <EditTeamModal team={team} open={editOpen} onOpenChange={setEditOpen} />}
      {canDelete && <DeleteTeamModal team={team} open={deleteOpen} onOpenChange={setDeleteOpen} />}
    </>
  );
}
