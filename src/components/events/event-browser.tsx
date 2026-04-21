"use client";

import {
  CalendarDays, Clock, LayoutList, MapPin,
  Plus, Repeat, Search, Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EventCardActions } from "@/components/events/event-card-actions";
import { CreateEventModal } from "@/components/events/create-event-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TeamRole } from "@/lib/constants/roles";
import {
  EVENT_TYPE_META,
  EVENT_TYPES,
  type EventType,
  type TeamEvent,
} from "@/lib/constants/events";
import type { GameLineup, Roster, Team } from "@/lib/constants/teams";

type FilterType = EventType | "all";
type SortKey    = "date-asc" | "date-desc";
type ViewMode   = "card" | "list";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
    year:    "numeric",
  });
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour  = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function isUpcoming(ev: TeamEvent) {
  const today = new Date(new Date().toDateString());
  const d     = new Date(ev.event_date + "T00:00:00");
  return d >= today;
}

// ── sub-components ────────────────────────────────────────────────────────────

function EventTypeBadge({ type }: { type: EventType }) {
  const meta = EVENT_TYPE_META[type];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        meta.bgColor, meta.color, meta.border,
      )}
    >
      {meta.label}
    </span>
  );
}

function EventCard({
  event, teamMap, rosterMap, lineupMap, teams, rosters, lineups, userRole,
}: {
  event:     TeamEvent;
  teamMap:   Record<string, Team>;
  rosterMap: Record<string, Roster>;
  lineupMap: Record<string, GameLineup>;
  teams:     Team[];
  rosters:   Roster[];
  lineups:   GameLineup[];
  userRole?: TeamRole | null;
}) {
  const team   = event.team_id   ? teamMap[event.team_id]     : null;
  const roster = event.roster_id ? rosterMap[event.roster_id] : null;
  const lineup = event.lineup_id ? lineupMap[event.lineup_id] : null;
  const past   = !isUpcoming(event);

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col gap-2.5 rounded-lg border bg-card p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md",
        past
          ? "border-border/50 opacity-70 hover:opacity-100"
          : "border-border hover:border-primary/30",
      )}
    >
      {/* Clickable overlay to detail page */}
      <Link
        href={`/events/${event.id}`}
        className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`View ${event.title}`}
      />

      {/* Top row: badge + recurring indicator + actions */}
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <EventTypeBadge type={event.type} />
          {event.recurrence_group_id && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <Repeat className="h-2.5 w-2.5" />
              Recurring
            </span>
          )}
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <EventCardActions event={event} teams={teams} rosters={rosters} lineups={lineups} userRole={userRole} />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {event.title}
        {(event.type === "game" || event.type === "scrimmage") && event.opponent && (
          <span className="font-normal text-muted-foreground"> vs. {event.opponent}</span>
        )}
      </h3>

      {/* Date + time */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span className={cn(past && "line-through opacity-60")}>{formatDate(event.event_date)}</span>
        </div>
        {event.start_time && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <span>
              {formatTime(event.start_time)}
              {event.end_time && ` – ${formatTime(event.end_time)}`}
            </span>
          </div>
        )}
      </div>

      {/* Location */}
      {event.location && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">{event.location}</span>
        </div>
      )}

      {/* Team / roster */}
      {(team || roster) && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">
            {team?.name}
            {team && roster && " · "}
            {roster?.name}
          </span>
        </div>
      )}

      {/* Linked lineup */}
      {lineup && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <LayoutList className="h-3 w-3 shrink-0 text-primary/60" />
          <span className="line-clamp-1 font-medium text-primary/80">{lineup.name}</span>
        </div>
      )}

      {/* Notes preview */}
      {event.notes && (
        <p className="mt-auto line-clamp-2 text-xs text-muted-foreground">{event.notes}</p>
      )}

      {/* Home/Away badge (games/scrimmages) */}
      {(event.type === "game" || event.type === "scrimmage") && (
        <div className="mt-auto flex shrink-0 items-center">
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            event.is_home
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}>
            {event.is_home ? "Home" : "Away"}
          </span>
        </div>
      )}
    </div>
  );
}

function EventRow({
  event, teamMap, rosterMap, lineupMap, teams, rosters, lineups, userRole,
}: {
  event:     TeamEvent;
  teamMap:   Record<string, Team>;
  rosterMap: Record<string, Roster>;
  lineupMap: Record<string, GameLineup>;
  teams:     Team[];
  rosters:   Roster[];
  lineups:   GameLineup[];
  userRole?: TeamRole | null;
}) {
  const team   = event.team_id   ? teamMap[event.team_id]     : null;
  const lineup = event.lineup_id ? lineupMap[event.lineup_id] : null;
  const past = !isUpcoming(event);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-all hover:shadow-sm",
        past ? "border-border/50 opacity-70 hover:opacity-100" : "border-border hover:border-primary/20",
      )}
    >
      <Link
        href={`/events/${event.id}`}
        className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`View ${event.title}`}
      />

      {/* Type badge */}
      <EventTypeBadge type={event.type} />

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
          {event.title}
          {(event.type === "game" || event.type === "scrimmage") && event.opponent && (
            <span className="font-normal text-muted-foreground"> vs. {event.opponent}</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {team && (
            <p className="truncate text-xs text-muted-foreground">{team.name}</p>
          )}
          {lineup && (
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary/80">
              <LayoutList className="h-3 w-3 text-primary/60" />
              {lineup.name}
            </span>
          )}
        </div>
      </div>

      {/* Date */}
      <div className="hidden shrink-0 flex-col items-end sm:flex">
        <span className={cn("text-xs font-medium", past && "line-through opacity-60")}>
          {formatDate(event.event_date)}
        </span>
        {event.start_time && (
          <span className="text-xs text-muted-foreground">{formatTime(event.start_time)}</span>
        )}
      </div>

      {/* Location */}
      {event.location && (
        <span className="hidden shrink-0 max-w-[140px] truncate text-xs text-muted-foreground lg:block">
          {event.location}
        </span>
      )}

      {/* Actions */}
      <div className="relative z-10 shrink-0">
        <EventCardActions event={event} teams={teams} rosters={rosters} lineups={lineups} userRole={userRole} />
      </div>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
      <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">
        {filtered ? "No events match your filters." : "No events yet."}
      </p>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

/** Determine the current user's effective role for a given event.
 *  - If the event belongs to a team: use the team role (may be undefined → null).
 *  - If no team (or user not a member): fall back to "owner" if the user created it. */
function resolveEventRole(
  ev: TeamEvent,
  teamRoles: Record<string, TeamRole> | undefined,
  userId: string | undefined,
): TeamRole | null {
  if (ev.team_id) {
    return teamRoles?.[ev.team_id] ?? (userId && ev.user_id === userId ? "owner" : null);
  }
  return userId && ev.user_id === userId ? "owner" : null;
}

type Props = {
  events:    TeamEvent[];
  teams:     Team[];
  rosters:   Roster[];
  lineups:   GameLineup[];
  teamRoles?: Record<string, TeamRole>;
  /** The current user's ID — used to grant owner-level permissions on events they created. */
  userId?: string;
};

export function EventBrowser({ events, teams, rosters, lineups, teamRoles, userId }: Props) {
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [search,     setSearch]     = useState("");
  const [sort,       setSort]       = useState<SortKey>("date-asc");
  const [view,       setView]       = useState<ViewMode>("card");
  const [createOpen, setCreateOpen] = useState(false);

  const teamMap = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams],
  );
  const rosterMap = useMemo(
    () => Object.fromEntries(rosters.map((r) => [r.id, r])),
    [rosters],
  );
  const lineupMap = useMemo(
    () => Object.fromEntries(lineups.map((l) => [l.id, l])),
    [lineups],
  );

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      if (typeFilter !== "all" && ev.type !== typeFilter)          return false;
      if (teamFilter !== "all" && ev.team_id !== teamFilter)       return false;
      if (search) {
        const q = search.toLowerCase();
        const teamName = ev.team_id ? (teamMap[ev.team_id]?.name ?? "") : "";
        if (
          !ev.title.toLowerCase().includes(q) &&
          !(ev.opponent ?? "").toLowerCase().includes(q) &&
          !teamName.toLowerCase().includes(q) &&
          !(ev.location ?? "").toLowerCase().includes(q) &&
          !(ev.notes ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [events, typeFilter, teamFilter, search, teamMap]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aTime = new Date(a.event_date + "T" + (a.start_time ?? "00:00")).getTime();
      const bTime = new Date(b.event_date + "T" + (b.start_time ?? "00:00")).getTime();
      return sort === "date-asc" ? aTime - bTime : bTime - aTime;
    });
  }, [filtered, sort]);

  const upcoming = useMemo(() => sorted.filter(isUpcoming),  [sorted]);
  const past     = useMemo(() => sorted.filter((e) => !isUpcoming(e)), [sorted]);

  const typeFilterOptions: { id: FilterType; label: string }[] = [
    { id: "all",        label: "All" },
    ...EVENT_TYPES.map((t) => ({ id: t as FilterType, label: EVENT_TYPE_META[t].label })),
  ];

  const teamFilterOptions = [
    { id: "all", label: "All teams" },
    ...teams
      .filter((t) => events.some((e) => e.team_id === t.id))
      .map((t) => ({ id: t.id, label: t.name })),
  ];

  function renderSection(evs: TeamEvent[], label: string, emptyMsg: string) {
    if (evs.length === 0 && !search && typeFilter === "all" && teamFilter === "all") return null;
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
          {label}
          <span className="ml-2 text-xs font-normal normal-case text-muted-foreground">
            ({evs.length})
          </span>
        </h2>
        {evs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMsg}</p>
        ) : view === "card" ? (
          <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {evs.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                teamMap={teamMap}
                rosterMap={rosterMap}
                lineupMap={lineupMap}
                teams={teams}
                rosters={rosters}
                lineups={lineups}
                userRole={resolveEventRole(ev, teamRoles, userId)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {evs.map((ev) => (
              <EventRow
                key={ev.id}
                event={ev}
                teamMap={teamMap}
                rosterMap={rosterMap}
                lineupMap={lineupMap}
                teams={teams}
                rosters={rosters}
                lineups={lineups}
                userRole={resolveEventRole(ev, teamRoles, userId)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isFiltered = typeFilter !== "all" || teamFilter !== "all" || !!search;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Controls ── */}
      <div className="flex flex-col gap-3">
        {/* Search + view toggle + sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-10 rounded-md border border-input bg-background pl-3 pr-10 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="date-asc">Soonest first</option>
            <option value="date-desc">Latest first</option>
          </select>

          {/* View toggle */}
          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              type="button"
              onClick={() => setView("card")}
              title="Card view"
              className={cn(
                "flex h-10 w-10 items-center justify-center transition-colors",
                view === "card"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2" />
                <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2" />
                <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2" />
                <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              title="List view"
              className={cn(
                "flex h-10 w-10 items-center justify-center border-l border-border transition-colors",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {typeFilterOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTypeFilter(opt.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                typeFilter === opt.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground/70 hover:border-primary/40 hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Team filter chips (only if multiple teams) */}
        {teams.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {teamFilterOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTeamFilter(opt.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                  teamFilter === opt.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground/70 hover:border-primary/40 hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Result count ── */}
      <p className="text-xs text-muted-foreground">
        {sorted.length} event{sorted.length !== 1 ? "s" : ""}
        {search && <> matching &ldquo;{search}&rdquo;</>}
      </p>

      {/* ── No results at all ── */}
      {sorted.length === 0 && <EmptyState filtered={isFiltered} />}

      {/* ── Upcoming ── */}
      {sorted.length > 0 && renderSection(upcoming, "Upcoming", "No upcoming events.")}

      {/* ── Past ── */}
      {sorted.length > 0 && past.length > 0 && (
        <details className="group" open={upcoming.length === 0}>
          <summary className="flex cursor-pointer list-none items-center gap-2 py-1">
            <span className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
              Past events
              <span className="ml-2 text-xs font-normal normal-case text-muted-foreground">
                ({past.length})
              </span>
            </span>
            <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Show</span>
            <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">Hide</span>
          </summary>
          <div className="mt-3">
            {view === "card" ? (
              <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    teamMap={teamMap}
                    rosterMap={rosterMap}
                    lineupMap={lineupMap}
                    teams={teams}
                    rosters={rosters}
                    lineups={lineups}
                    userRole={resolveEventRole(ev, teamRoles, userId)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {past.map((ev) => (
                  <EventRow
                    key={ev.id}
                    event={ev}
                    teamMap={teamMap}
                    rosterMap={rosterMap}
                    lineupMap={lineupMap}
                    teams={teams}
                    rosters={rosters}
                    lineups={lineups}
                    userRole={resolveEventRole(ev, teamRoles, userId)}
                  />
                ))}
              </div>
            )}
          </div>
        </details>
      )}

      {/* ── Empty first-run CTA ── */}
      {events.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
          <div>
            <p className="font-medium">No events scheduled yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first game, practice, or scrimmage to get started.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create event
          </Button>
        </div>
      )}

      <CreateEventModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        teams={teams}
        rosters={rosters}
        lineups={lineups}
      />
    </div>
  );
}
