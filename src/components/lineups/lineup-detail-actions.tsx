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

export function LineupDetailActions({ lineup, activeRosters, rosterPlayersMap, userRole }: Props) {
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
      <div className="flex items-center gap-2">
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Edit lineup
          </Button>
        )}

        {canArchive && (
          <Button
            variant="outline" size="sm"
            onClick={handleArchiveToggle} disabled={isPending}
            className="gap-1.5"
          >
            {lineup.is_archived ? (
              <><ArchiveRestore className="h-3.5 w-3.5" />Unarchive</>
            ) : (
              <><Archive className="h-3.5 w-3.5" />Archive</>
            )}
          </Button>
        )}

        {canDelete && (
          <Button
            variant="outline" size="sm"
            onClick={() => setDeleteOpen(true)}
            className="gap-1.5 text-destructive hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
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
        <DeleteLineupModal lineup={lineup} open={deleteOpen} onOpenChange={setDeleteOpen} redirectTo="/lineups" />
      )}
    </>
  );
}
