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

export function LineupCardActions({ lineup, activeRosters, rosterPlayersMap }: Props) {
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
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => setEditOpen(true)} title="Edit lineup">
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Edit</span>
        </Button>

        <Button variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={handleArchiveToggle} disabled={isPending}
          title={lineup.is_archived ? "Unarchive lineup" : "Archive lineup"}>
          {lineup.is_archived
            ? <ArchiveRestore className="h-3.5 w-3.5" />
            : <Archive       className="h-3.5 w-3.5" />}
          <span className="sr-only">{lineup.is_archived ? "Unarchive" : "Archive"}</span>
        </Button>

        <Button variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)} title="Delete lineup">
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>

      <EditLineupModal
        lineup={lineup}
        open={editOpen}
        onOpenChange={setEditOpen}
        activeRosters={activeRosters}
        rosterPlayersMap={rosterPlayersMap}
      />
      <DeleteLineupModal lineup={lineup} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
