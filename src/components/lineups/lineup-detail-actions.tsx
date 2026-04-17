"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setLineupArchived } from "@/app/actions/lineups";
import { DeleteLineupModal } from "@/components/lineups/delete-lineup-modal";
import { EditLineupModal } from "@/components/lineups/edit-lineup-modal";
import { Button } from "@/components/ui/button";
import type { GameLineup, Player, Roster } from "@/lib/constants/teams";

type Props = {
  lineup: GameLineup;
  activeRosters: Roster[];
  rosterPlayersMap: Record<string, Player[]>;
};

export function LineupDetailActions({ lineup, activeRosters, rosterPlayersMap }: Props) {
  const router = useRouter();
  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleArchiveToggle() {
    startTransition(async () => {
      await setLineupArchived(lineup.id, lineup.team_id, !lineup.is_archived);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
          className="gap-1.5"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit lineup
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleArchiveToggle}
          disabled={isPending}
          className="gap-1.5"
        >
          {lineup.is_archived ? (
            <>
              <ArchiveRestore className="h-3.5 w-3.5" />
              Unarchive
            </>
          ) : (
            <>
              <Archive className="h-3.5 w-3.5" />
              Archive
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          className="gap-1.5 text-destructive hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <EditLineupModal
        lineup={lineup}
        open={editOpen}
        onOpenChange={setEditOpen}
        activeRosters={activeRosters}
        rosterPlayersMap={rosterPlayersMap}
      />
      <DeleteLineupModal
        lineup={lineup}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        redirectTo="/lineups"
      />
    </>
  );
}
