"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TeamCardActions } from "@/components/teams/team-card-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/constants/teams";

export function TeamsArchivedSection({ teams }: { teams: Team[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-8">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {expanded ? "Hide" : "View"} archived teams ({teams.length})
      </Button>

      {expanded && (
        <div className="mt-3 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <ArchivedTeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArchivedTeamCard({ team }: { team: Team }) {
  return (
    <div className="group relative flex h-full min-h-0 flex-col gap-2 rounded-lg border border-border bg-muted/40 p-4 opacity-75 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:opacity-90">
      <Link
        href={`/teams/${team.id}`}
        className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Open ${team.name}`}
      />

      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug text-muted-foreground group-hover:text-foreground transition-colors">
          {team.name}
        </h3>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="muted">Archived</Badge>
          <div className="relative z-10">
            <TeamCardActions team={team} />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {team.year && <>{team.year} · </>}
        {team.season} · {team.division} · {team.age_group} · {team.team_type}
      </p>
      {team.organization && (
        <p className="text-xs text-muted-foreground">{team.organization}</p>
      )}
      <div className="min-h-0 flex-1" aria-hidden />
    </div>
  );
}
