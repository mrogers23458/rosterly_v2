"use client";

import { Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setPlayerIsActive } from "@/app/actions/players";
import { DeletePlayerModal } from "@/components/players/delete-player-modal";
import { EditPlayerModal } from "@/components/players/edit-player-modal";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/constants/roles";
import type { TeamRole } from "@/lib/constants/roles";
import type { Player } from "@/lib/constants/teams";

type Props = {
  player: Player;
  teamId: string | null;
  rosterId: string;
  userRole?: TeamRole | null;
};

export function PlayerRowActions({ player, teamId, rosterId, userRole }: Props) {
  const router = useRouter();
  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canEdit   = can(userRole, "player:edit");
  const canDelete = can(userRole, "player:delete");

  if (!canEdit && !canDelete) return null;

  function handleActiveToggle() {
    startTransition(async () => {
      await setPlayerIsActive(player.id, rosterId, teamId, !player.is_active);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {canEdit && (
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setEditOpen(true)} title="Edit player"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
        )}

        {canEdit && (
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleActiveToggle} disabled={isPending}
            title={player.is_active ? "Deactivate player" : "Reactivate player"}
          >
            {player.is_active ? (
              <UserX className="h-3.5 w-3.5" />
            ) : (
              <UserCheck className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">{player.is_active ? "Deactivate" : "Reactivate"}</span>
          </Button>
        )}

        {canDelete && (
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteOpen(true)} title="Remove player"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </div>

      {canEdit && (
        <EditPlayerModal player={player} teamId={teamId} rosterId={rosterId} open={editOpen} onOpenChange={setEditOpen} />
      )}
      {canDelete && (
        <DeletePlayerModal player={player} teamId={teamId} rosterId={rosterId} open={deleteOpen} onOpenChange={setDeleteOpen} />
      )}
    </>
  );
}
