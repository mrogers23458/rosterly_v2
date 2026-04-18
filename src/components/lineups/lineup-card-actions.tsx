"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setLineupArchived } from "@/app/actions/lineups";
import { DeleteLineupModal } from "@/components/lineups/delete-lineup-modal";
import { EditLineupModal } from "@/components/lineups/edit-lineup-modal";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/constants/roles";
import type { TeamRole } from "@/lib/constants/roles";
import type { GameLineup, Player, Roster } from "@/lib/constants/teams";

type Props = {
  lineup: GameLineup;
  activeRosters: Roster[];
  rosterPlayersMap: Record<string, Player[]>;
  userRole?: TeamRole | null;
};

export function LineupCardActions({ lineup, activeRosters, rosterPlayersMap, userRole }: Props) {
  const router = useRouter();
  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canEdit    = can(userRole, "lineup:edit");
  const canArchive = can(userRole, "lineup:archive");
  const canDelete  = can(userRole, "lineup:delete");

  if (!canEdit && !canArchive && !canDelete) return null;

  function handleArchiveToggle() {
    startTransition(async () => {
      await setLineupArchived(lineup.id, lineup.team_id, !lineup.is_archived);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {canEdit && (
          <Button variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setEditOpen(true)} title="Edit lineup">
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
        )}

        {canArchive && (
          <Button variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleArchiveToggle} disabled={isPending}
            title={lineup.is_archived ? "Unarchive lineup" : "Archive lineup"}>
            {lineup.is_archived
              ? <ArchiveRestore className="h-3.5 w-3.5" />
              : <Archive       className="h-3.5 w-3.5" />}
            <span className="sr-only">{lineup.is_archived ? "Unarchive" : "Archive"}</span>
          </Button>
        )}

        {canDelete && (
          <Button variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteOpen(true)} title="Delete lineup">
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </div>

      {canEdit && (
        <EditLineupModal
          lineup={lineup}
          open={editOpen}
          onOpenChange={setEditOpen}
          activeRosters={activeRosters}
          rosterPlayersMap={rosterPlayersMap}
        />
      )}
      {canDelete && (
        <DeleteLineupModal lineup={lineup} open={deleteOpen} onOpenChange={setDeleteOpen} />
      )}
    </>
  );
}
