"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setPlayerIsActive } from "@/app/actions/players";
import { DeletePlayerModal } from "@/components/players/delete-player-modal";
import { EditPlayerModal } from "@/components/players/edit-player-modal";
import { Button } from "@/components/ui/button";
import type { Player } from "@/lib/constants/teams";

type Props = {
  player: Player;
  teamId: string | null;
  rosterId: string;
};

export function PlayerRowActions({ player, teamId, rosterId }: Props) {
  const router = useRouter();
  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleActiveToggle() {
    startTransition(async () => {
      await setPlayerIsActive(player.id, rosterId, teamId, !player.is_active);
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
          title="Edit player"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Edit</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={handleActiveToggle}
          disabled={isPending}
          title={player.is_active ? "Mark inactive (archive)" : "Mark active (restore)"}
        >
          {player.is_active ? (
            <Archive className="h-3.5 w-3.5" />
          ) : (
            <ArchiveRestore className="h-3.5 w-3.5" />
          )}
          <span className="sr-only">{player.is_active ? "Archive" : "Restore"}</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          title="Remove player"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>

      <EditPlayerModal
        player={player}
        teamId={teamId}
        rosterId={rosterId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeletePlayerModal
        player={player}
        teamId={teamId}
        rosterId={rosterId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
