"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { TeamCard } from "@/components/teams/team-card";
import { SortableCardGrid } from "@/components/ui/sortable-card-grid";
import { Input } from "@/components/ui/input";
import type { TeamRole } from "@/lib/constants/roles";
import type { Team } from "@/lib/constants/teams";

export function TeamsDirectory({
  teams,
  teamRoles,
}: {
  teams: Team[];
  teamRoles?: Record<string, TeamRole>;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return teams;
    const q = search.toLowerCase();
    return teams.filter((t) => {
      const hay = [
        t.name, t.year, t.season, t.division, t.age_group, t.team_type, t.organization ?? "",
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [teams, search]);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search teams…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} team{filtered.length !== 1 ? "s" : ""}
        {search.trim() && <> matching &ldquo;{search.trim()}&rdquo;</>}
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No teams match your search.</p>
      ) : (
        <SortableCardGrid
          storageKey="teams"
          items={filtered.map((team) => ({
            id: team.id,
            node: <TeamCard team={team} userRole={teamRoles?.[team.id]} />,
          }))}
        />
      )}
    </div>
  );
}
