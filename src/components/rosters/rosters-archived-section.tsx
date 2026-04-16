"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RosterCardActions } from "@/components/rosters/roster-card-actions";
import { Badge } from "@/components/ui/badge";
import type { Roster, Team } from "@/lib/constants/teams";

type Props = { rosters: Roster[]; teamId: string; teams: Team[] };

export function RostersArchivedSection({ rosters, teamId, teams }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (rosters.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {expanded ? "Hide" : "Show"} {rosters.length} archived roster{rosters.length !== 1 ? "s" : ""}
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rosters.map((roster) => (
            <div
              key={roster.id}
              className="group relative flex h-full min-h-0 flex-col gap-2 rounded-lg border border-border bg-card/60 p-4 opacity-70 transition-all duration-150 hover:opacity-100 hover:-translate-y-0.5 hover:shadow-md"
            >
              <Link href={`/rosters/${teamId}/${roster.id}`} className="absolute inset-0 rounded-lg" />
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                  {roster.name}
                </h3>
                <div className="relative z-10 flex items-center gap-1">
                  <Badge variant="muted">Archived</Badge>
                  <RosterCardActions roster={roster} teams={teams} />
                </div>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {[roster.year, roster.season].filter(Boolean).join(" · ")}
              </p>
              <div className="flex min-h-0 flex-1 flex-col">
                {roster.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{roster.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
