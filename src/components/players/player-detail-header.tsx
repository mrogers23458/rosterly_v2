"use client";

import { UserX, UserCheck, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setPlayerIsActive } from "@/app/actions/players";
import { EditPlayerModal } from "@/components/players/edit-player-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TeamRole } from "@/lib/constants/roles";
import { can } from "@/lib/constants/roles";
import type { Player } from "@/lib/constants/teams";

type Props = {
  player:   Player;
  teamId:   string | null;
  rosterId: string;
  userRole: TeamRole | null;
  /** Override the role-derived canEdit (e.g. for approved claimers). */
  canEdit?: boolean;
};

export function PlayerDetailHeader({ player, teamId, rosterId, userRole, canEdit: canEditProp }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen]       = useState(false);
  const [isPending, startTransition]  = useTransition();

  const canEdit = canEditProp ?? can(userRole, "player:edit");

  const displayName = player.preferred_name?.trim()
    ? `${player.first_name} "${player.preferred_name}" ${player.last_name}`
    : `${player.first_name} ${player.last_name}`;

  const allPositions = [
    ...player.primary_positions.map((p) => ({ pos: p, primary: true })),
    ...player.secondary_positions.map((p) => ({ pos: p, primary: false })),
  ];

  const batsThrows = [player.bats, player.throws].filter(Boolean).join("/");

  function handleActiveToggle() {
    startTransition(async () => {
      await setPlayerIsActive(player.id, rosterId, teamId, !player.is_active);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: photo + identity */}
        <div className="flex items-start gap-4">
          {/* Player photo / avatar */}
          {player.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={player.image_url}
              alt={displayName}
              className="h-16 w-16 flex-shrink-0 rounded-full border border-border object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted text-xl font-bold text-muted-foreground">
              {player.first_name.charAt(0).toUpperCase()}{player.last_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{displayName}</h1>
              {player.jersey_number && (
                <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-sm font-semibold text-muted-foreground">
                  #{player.jersey_number}
                </span>
              )}
              <Badge variant={player.is_active ? "success" : "muted"}>
                {player.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>

            {/* Bats / Throws + Positions */}
            <div className="flex flex-wrap items-center gap-2">
              {batsThrows && (
                <span className="text-sm text-muted-foreground">
                  B/T: <span className="font-medium text-foreground">{batsThrows}</span>
                </span>
              )}
              {batsThrows && allPositions.length > 0 && (
                <span className="text-muted-foreground/40">·</span>
              )}
              {allPositions.map(({ pos, primary }) => (
                <span
                  key={pos}
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-xs font-semibold",
                    primary
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {pos}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: actions */}
        {canEdit && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleActiveToggle}
              disabled={isPending}
              title={player.is_active ? "Deactivate player" : "Reactivate player"}
            >
              {player.is_active ? (
                <><UserX className="h-3.5 w-3.5" />Deactivate</>
              ) : (
                <><UserCheck className="h-3.5 w-3.5" />Reactivate</>
              )}
            </Button>
          </div>
        )}
      </div>

      {canEdit && (
        <EditPlayerModal
          player={player}
          teamId={teamId}
          rosterId={rosterId}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </>
  );
}
