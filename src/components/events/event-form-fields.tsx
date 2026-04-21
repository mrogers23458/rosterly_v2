"use client";

import { LayoutList, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EVENT_TYPE_META, EVENT_TYPES, RECURRENCE_TYPES, RECURRENCE_TYPE_LABELS,
  type EventType, type RecurrenceType,
} from "@/lib/constants/events";
import type { GameLineup, Roster, Team } from "@/lib/constants/teams";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  type:       EventType;
  title:      string;
  opponent:   string;
  eventDate:  string;
  startTime:  string;
  endTime:    string;
  location:   string;
  notes:      string;
  isHome:     boolean;
  teamId:     string;
  rosterId:   string;
  lineupId:   string;
  recurrenceType:    RecurrenceType | null;
  recurrenceEndDate: string;
  showRecurrence?:   boolean; // false in edit mode

  teams:   Team[];
  rosters: Roster[];
  lineups: GameLineup[];

  onType:      (v: EventType) => void;
  onTitle:     (v: string) => void;
  onOpponent:  (v: string) => void;
  onEventDate: (v: string) => void;
  onStartTime: (v: string) => void;
  onEndTime:   (v: string) => void;
  onLocation:  (v: string) => void;
  onNotes:     (v: string) => void;
  onIsHome:    (v: boolean) => void;
  onTeamId:    (v: string) => void;
  onRosterId:  (v: string) => void;
  onLineupId:  (v: string) => void;
  onRecurrenceType:    (v: RecurrenceType | null) => void;
  onRecurrenceEndDate: (v: string) => void;
};

function formatLineupDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function EventFormFields({
  type, title, opponent, eventDate, startTime, endTime, location, notes,
  isHome, teamId, rosterId, lineupId, recurrenceType, recurrenceEndDate,
  showRecurrence = true,
  teams, rosters, lineups,
  onType, onTitle, onOpponent, onEventDate, onStartTime, onEndTime,
  onLocation, onNotes, onIsHome, onTeamId, onRosterId, onLineupId,
  onRecurrenceType, onRecurrenceEndDate,
}: Props) {
  const rostersForTeam = teamId
    ? rosters.filter((r) => r.team_id === teamId && !r.is_archived)
    : [];

  const lineupsForTeam = teamId
    ? lineups.filter((l) => l.team_id === teamId && !l.is_archived)
    : lineups.filter((l) => !l.is_archived);

  const showOpponent = type === "game" || type === "scrimmage";
  const showLineup   = type === "game" || type === "scrimmage";

  return (
    <div className="flex flex-col gap-4">
      {/* Event type pills */}
      <div className="flex flex-col gap-1.5">
        <Label>Event type</Label>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((t) => {
            const meta   = EVENT_TYPE_META[t];
            const active = t === type;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onType(t)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  active
                    ? `${meta.bgColor} ${meta.color} ${meta.border}`
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="event-title">Title</Label>
        <Input
          id="event-title"
          placeholder={
            type === "game"       ? "Auto-generated if blank (e.g. Game vs. Blue Jays)" :
            type === "practice"   ? "Auto-generated if blank (e.g. Practice – Apr 18)" :
            type === "scrimmage"  ? "Auto-generated if blank (e.g. Scrimmage vs. Tigers)" :
            type === "fundraiser" ? "Auto-generated if blank (e.g. Fundraiser – Apr 18)" :
                                    "Auto-generated if blank"
          }
          value={title}
          onChange={(e) => onTitle(e.target.value)}
        />
      </div>

      {/* Opponent + home/away (game & scrimmage only) */}
      {showOpponent && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="event-opponent">Opponent</Label>
            <Input
              id="event-opponent"
              placeholder="e.g. Blue Jays"
              value={opponent}
              onChange={(e) => onOpponent(e.target.value)}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-0.5 sm:pb-[9px]">
            <button
              type="button"
              onClick={() => onIsHome(!isHome)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                isHome
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {isHome ? "Home" : "Away"}
            </button>
          </div>
        </div>
      )}

      {/* Date + time */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          <Label htmlFor="event-date">
            Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="event-date"
            type="date"
            value={eventDate}
            onChange={(e) => onEventDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-start">Start time</Label>
          <Input
            id="event-start"
            type="time"
            value={startTime}
            onChange={(e) => onStartTime(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-end">End time</Label>
          <Input
            id="event-end"
            type="time"
            value={endTime}
            onChange={(e) => onEndTime(e.target.value)}
          />
        </div>
      </div>

      {/* Location */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="event-location">Location</Label>
        <Input
          id="event-location"
          placeholder="e.g. Spokane Baseball Fields, Field 3"
          value={location}
          onChange={(e) => onLocation(e.target.value)}
        />
      </div>

      {/* Team + Roster */}
      {teams.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-team">Team</Label>
            <select
              id="event-team"
              value={teamId}
              onChange={(e) => {
                onTeamId(e.target.value);
                onRosterId("");
                onLineupId("");
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-3 pr-10 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-roster">Roster</Label>
            <select
              id="event-roster"
              value={rosterId}
              onChange={(e) => onRosterId(e.target.value)}
              disabled={!teamId || rostersForTeam.length === 0}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-3 pr-10 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">No roster</option>
              {rostersForTeam.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Game Lineup (game & scrimmage only) */}
      {showLineup && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-lineup" className="flex items-center gap-1.5">
            <LayoutList className="h-3.5 w-3.5 text-muted-foreground" />
            Game lineup
          </Label>
          <select
            id="event-lineup"
            value={lineupId}
            onChange={(e) => onLineupId(e.target.value)}
            disabled={lineupsForTeam.length === 0}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-3 pr-10 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">No lineup linked</option>
            {lineupsForTeam.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.game_date ? ` — ${formatLineupDate(l.game_date)}` : ""}
                {` · ${l.inning_count} inn.`}
              </option>
            ))}
          </select>
          {lineupsForTeam.length === 0 && teamId && (
            <p className="text-xs text-muted-foreground">
              No lineups found for this team. Create one on the Lineups page first.
            </p>
          )}
          {!teamId && (
            <p className="text-xs text-muted-foreground">
              Select a team above to link a lineup.
            </p>
          )}
        </div>
      )}

      {/* Recurrence */}
      {showRecurrence && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-recurrence" className="flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
              Repeat
            </Label>
            <select
              id="event-recurrence"
              value={recurrenceType ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onRecurrenceType(v ? (v as RecurrenceType) : null);
                if (!v) onRecurrenceEndDate("");
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-3 pr-10 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Does not repeat</option>
              {RECURRENCE_TYPES.map((r) => (
                <option key={r} value={r}>{RECURRENCE_TYPE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          {recurrenceType && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-recurrence-end">
                Repeat until <span className="text-destructive">*</span>
              </Label>
              <Input
                id="event-recurrence-end"
                type="date"
                value={recurrenceEndDate}
                min={eventDate || undefined}
                onChange={(e) => onRecurrenceEndDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Individual events will be created from the start date through this end date.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="event-notes">Notes</Label>
        <Textarea
          id="event-notes"
          placeholder="Any notes for this event…"
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );
}
