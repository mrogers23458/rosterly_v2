"use client";

import { CalendarDays, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  EVENT_TYPE_META,
  EVENT_TYPES,
  type EventType,
  type TeamEvent,
} from "@/lib/constants/events";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const todayStr    = now.toDateString();
  const tomorrowStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString();
  if (d.toDateString() === todayStr)    return "Today";
  if (d.toDateString() === tomorrowStr) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86_400_000);
}

type FilterType = EventType | "all";

type Props = {
  upcomingEvents: TeamEvent[];
  teamMap:        Record<string, string>;
  hasTeams:       boolean;
};

export function UpcomingEventsWidget({ upcomingEvents, teamMap, hasTeams }: Props) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = filter === "all"
    ? upcomingEvents
    : upcomingEvents.filter((e) => e.type === filter);

  // Only show filter chips for types that actually have events
  const presentTypes = Array.from(new Set(upcomingEvents.map((e) => e.type)));

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card" style={{ height: "100%" }}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Upcoming Events</h2>
        </div>
        {hasTeams && (
          <Link href="/events" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            View all →
          </Link>
        )}
      </div>

      {/* Filter chips — only shown when there are multiple types present */}
      {upcomingEvents.length > 0 && presentTypes.length > 1 && (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
              filter === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            All
          </button>
          {EVENT_TYPES.filter((t) => presentTypes.includes(t)).map((t) => {
            const meta   = EVENT_TYPE_META[t];
            const active = filter === t;
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
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
      )}

      {/* Content — scrollable area */}
      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {filter !== "all"
              ? `No upcoming ${EVENT_TYPE_META[filter as EventType].label.toLowerCase()}s scheduled.`
              : "No upcoming events scheduled."}
          </p>
          {hasTeams && filter === "all" && (
            <Link href="/events" className="text-xs text-primary hover:underline">
              Create an event →
            </Link>
          )}
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {filtered.map((event) => {
            const meta    = EVENT_TYPE_META[event.type];
            const days    = daysUntil(event.event_date);
            const isToday = days === 0;
            const isSoon  = days <= 3;
            const teamName = event.team_id ? teamMap[event.team_id] : null;

            return (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  {/* Date chip */}
                  <div className={cn(
                    "flex w-[4.5rem] shrink-0 flex-col items-center rounded-md px-1.5 py-1.5 text-center text-[10px] font-semibold leading-tight",
                    isToday ? "bg-primary text-primary-foreground"
                    : isSoon ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-muted text-muted-foreground",
                  )}>
                    {formatEventDate(event.event_date)}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "inline-flex shrink-0 rounded-full border px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide",
                        meta.bgColor, meta.color, meta.border,
                      )}>
                        {meta.label}
                      </span>
                      <p className="truncate text-sm font-medium">{event.title}</p>
                    </div>

                    <div className="mt-0.5 flex items-center gap-2">
                      {event.start_time && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {formatTime(event.start_time)}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex min-w-0 items-center gap-0.5 text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </span>
                      )}
                      {!event.start_time && !event.location && teamName && (
                        <span className="truncate text-[10px] text-muted-foreground">{teamName}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
