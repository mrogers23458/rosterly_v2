"use client";

import { Search, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RosterCardActions } from "@/components/rosters/roster-card-actions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TeamRole } from "@/lib/constants/roles";
import type { Roster, Team } from "@/lib/constants/teams";

type Props = {
  rosters: Roster[];
  teams: Team[];
  teamRoles?: Record<string, TeamRole>;
};

export function RosterBrowser({ rosters, teams, teamRoles }: Props) {
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [search,     setSearch]     = useState("");

  const hasUnassigned = rosters.some((r) => !r.team_id);
  const teamMap       = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams],
  );

  const filtered = useMemo(() => {
    return rosters.filter((r) => {
      if (teamFilter === "none"  && r.team_id !== null) return false;
      if (teamFilter !== "all" && teamFilter !== "none" && r.team_id !== teamFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const teamName = r.team_id ? (teamMap[r.team_id]?.name ?? "") : "";
        if (
          !r.name.toLowerCase().includes(q) &&
          !teamName.toLowerCase().includes(q) &&
          !(r.season ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [rosters, teamFilter, search, teamMap]);

  type Tab = { id: string; label: string; count: number };
  const tabs: Tab[] = [
    { id: "all",  label: "All teams",  count: rosters.length },
    ...teams
      .filter((t) => rosters.some((r) => r.team_id === t.id))
      .map((t) => ({
        id:    t.id,
        label: t.name,
        count: rosters.filter((r) => r.team_id === t.id).length,
      })),
    ...(hasUnassigned
      ? [{ id: "none", label: "No team", count: rosters.filter((r) => !r.team_id).length }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rosters…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTeamFilter(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                teamFilter === tab.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground/70 hover:border-primary/40 hover:text-foreground",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  teamFilter === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} roster{filtered.length !== 1 ? "s" : ""}
        {search && <> matching &ldquo;{search}&rdquo;</>}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Users className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No rosters found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((roster) => (
            <RosterCard
              key={roster.id}
              roster={roster}
              team={roster.team_id ? teamMap[roster.team_id] : null}
              allTeams={teams}
              userRole={roster.team_id ? teamRoles?.[roster.team_id] : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RosterCard({
  roster,
  team,
  allTeams,
  userRole,
}: {
  roster: Roster;
  team: Team | null | undefined;
  allTeams: Team[];
  userRole?: import("@/lib/constants/roles").TeamRole | null;
}) {
  const canLink = Boolean(roster.team_id);

  return (
    <div className="group relative flex h-full min-h-0 flex-col gap-2 rounded-lg border border-border bg-card p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      {canLink && (
        <Link
          href={`/rosters/${roster.team_id}/${roster.id}`}
          className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Open ${roster.name}`}
        />
      )}

      <div className="flex shrink-0 items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {roster.name}
        </h3>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <Badge variant={roster.is_active ? "success" : "muted"} className="shrink-0">
            {roster.is_active ? "Active" : "Inactive"}
          </Badge>
          <RosterCardActions roster={roster} teams={allTeams} userRole={userRole} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Users className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="text-xs text-muted-foreground">
          {team ? team.name : <em>No team assigned</em>}
        </span>
      </div>

      {(roster.season || roster.year) && (
        <p className="shrink-0 text-xs text-muted-foreground">
          {[roster.year, roster.season].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {roster.notes && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{roster.notes}</p>
        )}
      </div>

      {!canLink && (
        <p className="mt-auto shrink-0 text-[11px] text-muted-foreground/60 italic">
          Assign to a team to open roster page
        </p>
      )}
    </div>
  );
}
