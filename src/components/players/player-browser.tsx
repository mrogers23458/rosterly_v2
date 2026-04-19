"use client";

import { Search, UserCircle2, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PlayerRowActions } from "@/components/players/player-row-actions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TeamRole } from "@/lib/constants/roles";
import type { Player, Roster, Team } from "@/lib/constants/teams";

type Props = {
  players: Player[];
  rosters: Roster[];
  teams: Team[];
  teamRoles?: Record<string, TeamRole>;
};

type EnrichedPlayer = Player & {
  rosterName: string;
  teamId: string | null;
  teamName: string;
};

export function PlayerBrowser({ players, rosters, teams, teamRoles }: Props) {
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [rosterFilter, setRosterFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const teamMap = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams],
  );
  const rosterMap = useMemo(
    () => Object.fromEntries(rosters.map((r) => [r.id, r])),
    [rosters],
  );

  const enriched: EnrichedPlayer[] = useMemo(
    () =>
      players.map((p) => {
        const roster = rosterMap[p.roster_id];
        const tid = roster?.team_id ?? null;
        return {
          ...p,
          rosterName: roster?.name ?? "Unknown roster",
          teamId: tid,
          teamName: tid ? (teamMap[tid]?.name ?? "Unknown team") : "No team",
        };
      }),
    [players, rosterMap, teamMap],
  );

  const hasUnassigned = rosters.some((r) => !r.team_id);

  const rosterTabs = useMemo(() => {
    if (teamFilter === "all") return [];
    if (teamFilter === "none") {
      return rosters.filter((r) => !r.team_id);
    }
    return rosters.filter((r) => r.team_id === teamFilter);
  }, [rosters, teamFilter]);

  const filtered = useMemo(() => {
    return enriched.filter((p) => {
      if (teamFilter === "none" && p.teamId !== null) return false;
      if (teamFilter !== "all" && teamFilter !== "none" && p.teamId !== teamFilter) return false;
      if (teamFilter !== "all" && rosterFilter !== "all" && p.roster_id !== rosterFilter) return false;

      if (search) {
        const q = search.toLowerCase();
        const hay = [
          p.first_name,
          p.last_name,
          p.preferred_name ?? "",
          p.jersey_number ?? "",
          p.rosterName,
          p.teamName,
          p.notes ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enriched, teamFilter, rosterFilter, search]);

  type Tab = { id: string; label: string; count: number };
  const teamTabs: Tab[] = [
    { id: "all", label: "All teams", count: enriched.length },
    ...teams
      .filter((t) => enriched.some((p) => p.teamId === t.id))
      .map((t) => ({
        id: t.id,
        label: t.name,
        count: enriched.filter((p) => p.teamId === t.id).length,
      })),
    ...(hasUnassigned
      ? [{ id: "none", label: "No team", count: enriched.filter((p) => p.teamId === null).length }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search players…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {teamTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setTeamFilter(tab.id);
                setRosterFilter("all");
              }}
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

        {teamFilter !== "all" && rosterTabs.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Roster
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setRosterFilter("all")}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                  rosterFilter === "all"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground/70 hover:border-primary/40 hover:text-foreground",
                )}
              >
                All rosters
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    rosterFilter === "all"
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {rosterTabs.length}
                </span>
              </button>
              {rosterTabs.map((r) => {
                const count = enriched.filter((p) => p.roster_id === r.id).length;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRosterFilter(r.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                      rosterFilter === r.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground/70 hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {r.name}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        rosterFilter === r.id
                          ? "bg-white/20 text-white"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} player{filtered.length !== 1 ? "s" : ""}
        {search && <> matching &ldquo;{search}&rdquo;</>}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <UserCircle2 className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No players found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const displayName = p.preferred_name?.trim() || `${p.first_name} ${p.last_name}`.trim();
            const initials = `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase();
            return (
              <div
                key={p.id}
                className="group relative flex h-full min-h-0 flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <Link
                  href={`/players/${p.id}`}
                  className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`Open ${displayName}`}
                />

                <div className="flex shrink-0 items-start justify-between gap-2">
                  {/* Avatar + name */}
                  <div className="flex min-w-0 items-center gap-2.5">
                    {p.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={p.image_url}
                        alt={displayName}
                        className="h-9 w-9 flex-shrink-0 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted text-xs font-bold text-muted-foreground">
                        {initials}
                      </div>
                    )}
                    <h3 className="min-w-0 text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                      {displayName}
                    </h3>
                  </div>

                  <div className="relative z-10 flex shrink-0 items-center gap-1">
                    <Badge variant={p.is_active ? "success" : "muted"} className="shrink-0 text-[10px]">
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <PlayerRowActions
                      player={p}
                      teamId={p.teamId}
                      rosterId={p.roster_id}
                      userRole={p.teamId ? teamRoles?.[p.teamId] : null}
                    />
                  </div>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {[p.first_name, p.last_name].filter(Boolean).join(" ")}
                  {p.jersey_number ? ` · #${p.jersey_number}` : ""}
                </p>
                <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                  <span>{p.teamName}</span>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">{p.rosterName}</p>
                <div className="min-h-0 flex-1" aria-hidden />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
