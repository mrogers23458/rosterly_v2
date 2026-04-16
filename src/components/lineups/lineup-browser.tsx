"use client";

import { CalendarDays, LayoutList, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LineupCardActions } from "@/components/lineups/lineup-card-actions";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { GameLineup, Player, Roster, Team } from "@/lib/constants/teams";

type Props = {
  lineups: GameLineup[];
  teams: Team[];
  rosters: Roster[];
  rosterPlayersMap: Record<string, Player[]>;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
    year:    "numeric",
  });
}

export function LineupBrowser({ lineups, teams, rosters, rosterPlayersMap }: Props) {
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [search,     setSearch]     = useState("");

  const teamMap = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams],
  );

  const filtered = useMemo(() => {
    return lineups.filter((l) => {
      if (teamFilter !== "all" && l.team_id !== teamFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const teamName = l.team_id ? (teamMap[l.team_id]?.name ?? "") : "";
        if (
          !l.name.toLowerCase().includes(q) &&
          !teamName.toLowerCase().includes(q) &&
          !(l.game_date ?? "").includes(q) &&
          !(l.notes ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [lineups, teamFilter, search, teamMap]);

  type Tab = { id: string; label: string; count: number };
  const tabs: Tab[] = [
    { id: "all", label: "All teams", count: lineups.length },
    ...teams
      .filter((t) => lineups.some((l) => l.team_id === t.id))
      .map((t) => ({
        id:    t.id,
        label: t.name,
        count: lineups.filter((l) => l.team_id === t.id).length,
      })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search lineups…"
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
        {filtered.length} lineup{filtered.length !== 1 ? "s" : ""}
        {search && <> matching &ldquo;{search}&rdquo;</>}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <LayoutList className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No lineups found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lineup) => (
            <LineupCard
              key={lineup.id}
              lineup={lineup}
              team={lineup.team_id ? teamMap[lineup.team_id] : null}
              rosters={rosters}
              rosterPlayersMap={rosterPlayersMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LineupCard({
  lineup,
  team,
  rosters,
  rosterPlayersMap,
}: {
  lineup: GameLineup;
  team: Team | null | undefined;
  rosters: Roster[];
  rosterPlayersMap: Record<string, Player[]>;
}) {
  const href = lineup.team_id ? `/teams/${lineup.team_id}` : "/lineups";

  const activeRostersForTeam = useMemo(() => {
    if (!lineup.team_id) return [];
    return rosters.filter(
      (r) => r.team_id === lineup.team_id && r.is_active && !r.is_archived,
    );
  }, [lineup.team_id, rosters]);

  const rosterPlayersSlice = useMemo(() => {
    const out: Record<string, Player[]> = {};
    for (const r of activeRostersForTeam) {
      out[r.id] = rosterPlayersMap[r.id] ?? [];
    }
    return out;
  }, [activeRostersForTeam, rosterPlayersMap]);

  const isPast = lineup.game_date
    ? new Date(lineup.game_date + "T00:00:00") < new Date(new Date().toDateString())
    : false;

  return (
    <div className="group relative flex h-full min-h-0 flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <Link
        href={href}
        className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Open ${lineup.name}`}
      />

      <div className="flex shrink-0 items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {lineup.name}
        </h3>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <LineupCardActions
            lineup={lineup}
            activeRosters={activeRostersForTeam}
            rosterPlayersMap={rosterPlayersSlice}
          />
        </div>
      </div>

      {team && (
        <p className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <LayoutList className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          {team.name}
        </p>
      )}

      {lineup.game_date && (
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span className={isPast ? "line-through opacity-60" : ""}>
            {formatDate(lineup.game_date)}
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {lineup.notes && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{lineup.notes}</p>
        )}
      </div>

      <div className="mt-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <LayoutList className="h-3 w-3" />
        {lineup.inning_count} innings
      </div>
    </div>
  );
}
