"use client";

import { CheckCircle2, HelpCircle, Users, XCircle } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { setPlayerAvailability } from "@/app/actions/availability";
import type { AvailabilityStatus, EventAvailability } from "@/lib/constants/events";
import type { Player } from "@/lib/constants/teams";
import type { TeamRole } from "@/lib/constants/roles";
import { can } from "@/lib/constants/roles";

type Props = {
  eventId:      string;
  players:      Player[];
  availability: EventAvailability[];
  userRole?:    TeamRole | null;
};

// Cycle order when clicking a status chip
const NEXT_STATUS: Record<AvailabilityStatus, AvailabilityStatus> = {
  unknown:     "available",
  available:   "unavailable",
  unavailable: "unknown",
};

const STATUS_CONFIG: Record<
  AvailabilityStatus,
  { label: string; icon: React.ReactNode; chip: string; row: string }
> = {
  available: {
    label: "Available",
    icon:  <CheckCircle2 className="h-3.5 w-3.5" />,
    chip:  "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
    row:   "",
  },
  unavailable: {
    label: "Out",
    icon:  <XCircle className="h-3.5 w-3.5" />,
    chip:  "bg-red-100 text-red-600 border-red-200 hover:bg-red-200",
    row:   "opacity-50",
  },
  unknown: {
    label: "Unknown",
    icon:  <HelpCircle className="h-3.5 w-3.5" />,
    chip:  "bg-muted text-muted-foreground border-border hover:bg-muted/80",
    row:   "",
  },
};

type PlayerStatus = { player: Player; status: AvailabilityStatus };

export function EventAvailabilityPanel({
  eventId, players, availability, userRole,
}: Props) {
  const canEdit = can(userRole, "event:edit");

  // Build initial status map
  const initialStatuses: PlayerStatus[] = players.map((p) => ({
    player: p,
    status: (availability.find((a) => a.player_id === p.id)?.status as AvailabilityStatus) ?? "unknown",
  }));

  const [optimisticStatuses, setOptimisticStatus] = useOptimistic(
    initialStatuses,
    (state, { playerId, status }: { playerId: string; status: AvailabilityStatus }) =>
      state.map((ps) => ps.player.id === playerId ? { ...ps, status } : ps),
  );

  const [, startTransition] = useTransition();

  function handleToggle(playerId: string, currentStatus: AvailabilityStatus) {
    if (!canEdit) return;
    const next = NEXT_STATUS[currentStatus];
    startTransition(async () => {
      setOptimisticStatus({ playerId, status: next });
      await setPlayerAvailability(eventId, playerId, next);
    });
  }

  const available   = optimisticStatuses.filter((s) => s.status === "available").length;
  const unavailable = optimisticStatuses.filter((s) => s.status === "unavailable").length;
  const unknown     = optimisticStatuses.filter((s) => s.status === "unknown").length;

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
        <Users className="h-7 w-7 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No roster linked to this event. Link a roster to track player availability.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary counts */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {available} available
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
          <XCircle className="h-3.5 w-3.5" />
          {unavailable} out
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          <HelpCircle className="h-3.5 w-3.5" />
          {unknown} unknown
        </span>
      </div>

      {canEdit && (
        <p className="text-xs text-muted-foreground">
          Click a player&apos;s status to cycle: Unknown → Available → Out
        </p>
      )}

      {/* Player list */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Player
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Positions
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                Availability
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {optimisticStatuses.map(({ player, status }) => {
              const cfg     = STATUS_CONFIG[status];
              const display = player.preferred_name?.trim() || `${player.first_name} ${player.last_name}`;
              const pos     = [
                ...player.primary_positions,
                ...player.secondary_positions,
              ].slice(0, 3).join(", ");

              return (
                <tr key={player.id} className={`bg-card transition-colors hover:bg-muted/20 ${cfg.row}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {player.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={player.image_url}
                          alt={display}
                          className="h-7 w-7 flex-shrink-0 rounded-full border border-border object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted text-[10px] font-bold text-muted-foreground">
                          {player.first_name.charAt(0)}{player.last_name.charAt(0)}
                        </span>
                      )}
                      <div>
                        <span className="font-medium">{display}</span>
                        {player.jersey_number && (
                          <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                            #{player.jersey_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {pos || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggle(player.id, status)}
                      disabled={!canEdit}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${cfg.chip} ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
