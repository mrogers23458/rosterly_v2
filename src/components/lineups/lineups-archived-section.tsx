"use client";

import { ChevronDown, ChevronRight, LayoutList } from "lucide-react";
import { useState } from "react";
import { LineupCardActions } from "@/components/lineups/lineup-card-actions";
import { Badge } from "@/components/ui/badge";
import type { GameLineup, Player, Roster } from "@/lib/constants/teams";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Props = {
  lineups: GameLineup[];
  rosterNameMap: Record<string, string>;
  activeRosters: Roster[];
  rosterPlayersMap: Record<string, Player[]>;
};

export function LineupsArchivedSection({ lineups, rosterNameMap, activeRosters, rosterPlayersMap }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (lineups.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {expanded ? "Hide" : "Show"} {lineups.length} archived lineup{lineups.length !== 1 ? "s" : ""}
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lineups.map((lineup) => (
            <div
              key={lineup.id}
              className="relative flex h-full min-h-0 flex-col gap-2 rounded-lg border border-border bg-card/60 p-4 opacity-70 transition-all duration-150 hover:opacity-100 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex shrink-0 items-start justify-between gap-2">
                <h3 className="text-sm font-semibold leading-snug">{lineup.name}</h3>
                <div className="relative z-10 flex items-center gap-1">
                  <Badge variant="muted">Archived</Badge>
                  <LineupCardActions
                    lineup={lineup}
                    activeRosters={activeRosters}
                    rosterPlayersMap={rosterPlayersMap}
                  />
                </div>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {[
                  lineup.game_date ? formatDate(lineup.game_date) : null,
                  lineup.roster_id ? rosterNameMap[lineup.roster_id] : null,
                ].filter(Boolean).join(" · ")}
              </p>
              <div className="flex min-h-0 flex-1 flex-col">
                {lineup.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{lineup.notes}</p>
                )}
              </div>
              <div className="mt-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <LayoutList className="h-3 w-3" />
                {lineup.inning_count} innings
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
