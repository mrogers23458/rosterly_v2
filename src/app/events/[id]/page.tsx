import { ArrowLeft, CalendarDays, Clock, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { EventDetailActions } from "@/components/events/event-detail-actions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  EVENT_TYPE_META,
  type TeamEvent,
} from "@/lib/constants/events";
import type { Roster, Team } from "@/lib/constants/teams";

type Props = { params: Promise<{ id: string }> };

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
    year:    "numeric",
  });
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  const ampm   = h >= 12 ? "PM" : "AM";
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default async function EventDetailPage({ params }: Props) {
  const { id }      = await params;
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const { data: eventRaw } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!eventRaw) notFound();
  const event = eventRaw as TeamEvent;

  const [{ data: teamRaw }, { data: rosterRaw }, { data: allTeams }, { data: allRosters }] =
    await Promise.all([
      event.team_id
        ? supabase.from("teams").select("*").eq("id", event.team_id).single()
        : Promise.resolve({ data: null }),
      event.roster_id
        ? supabase.from("rosters").select("*").eq("id", event.roster_id).single()
        : Promise.resolve({ data: null }),
      supabase.from("teams").select("*").eq("is_archived", false).order("name"),
      supabase.from("rosters").select("*").eq("is_archived", false),
    ]);

  const team      = teamRaw    as Team   | null;
  const roster    = rosterRaw  as Roster | null;
  const allTeamsList   = (allTeams   ?? []) as Team[];
  const allRostersList = (allRosters ?? []) as Roster[];

  const meta   = EVENT_TYPE_META[event.type];
  const isPast = new Date(event.event_date + "T00:00:00") < new Date(new Date().toDateString());
  const showOpponent = event.type === "game" || event.type === "scrimmage";

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      {/* Back link */}
      <Link
        href="/events"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Events
      </Link>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          {/* Type badge + archived */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
                meta.bgColor, meta.color, meta.border,
              )}
            >
              {meta.label}
            </span>
            {event.is_archived && <Badge variant="muted">Archived</Badge>}
            {isPast && !event.is_archived && (
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                Past
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {event.title}
            {showOpponent && event.opponent && (
              <span className="font-normal text-muted-foreground"> vs. {event.opponent}</span>
            )}
          </h1>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span className={cn(isPast && "line-through opacity-60")}>
                {formatDate(event.event_date)}
              </span>
            </span>

            {event.start_time && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 shrink-0" />
                {formatTime(event.start_time)}
                {event.end_time && ` – ${formatTime(event.end_time)}`}
              </span>
            )}

            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" />
                {event.location}
              </span>
            )}

            {(team || roster) && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 shrink-0" />
                {team?.name}
                {team && roster && " · "}
                {roster?.name}
              </span>
            )}
          </div>

          {/* Home / Away */}
          {showOpponent && (
            <div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  event.is_home
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {event.is_home ? "Home" : "Away"}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0">
          <EventDetailActions
            event={event}
            teams={allTeamsList}
            rosters={allRostersList}
          />
        </div>
      </div>

      {/* Notes */}
      {event.notes && (
        <div className="rounded-lg border border-border bg-muted/30 p-5">
          <h2 className="mb-2 text-sm font-semibold">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.notes}</p>
        </div>
      )}
    </div>
  );
}
