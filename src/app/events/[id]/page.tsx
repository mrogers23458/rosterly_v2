import {
  ArrowLeft, ArrowRight, CalendarDays, Clock, LayoutList, MapPin, Users,
} from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { EventDetailActions } from "@/components/events/event-detail-actions";
import { EventAvailabilityPanel } from "@/components/events/event-availability-panel";
import { EventRsvpPanel } from "@/components/events/event-rsvp-panel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getUserTeamRole } from "@/lib/permissions";
import type { TeamRole } from "@/lib/constants/roles";
import {
  EVENT_TYPE_META,
  type EventAvailability,
  type EventRsvp,
  type TeamEvent,
} from "@/lib/constants/events";
import type { GameLineup, Player, Roster, Team } from "@/lib/constants/teams";

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

function formatDateShort(dateStr: string) {
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

  const [
    { data: teamRaw },
    { data: rosterRaw },
    { data: lineupRaw },
    { data: allTeams },
    { data: allRosters },
    { data: allLineups },
  ] = await Promise.all([
    event.team_id
      ? supabase.from("teams").select("*").eq("id", event.team_id).single()
      : Promise.resolve({ data: null }),
    event.roster_id
      ? supabase.from("rosters").select("*").eq("id", event.roster_id).single()
      : Promise.resolve({ data: null }),
    event.lineup_id
      ? supabase.from("game_lineups").select("*").eq("id", event.lineup_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("teams").select("*").eq("is_archived", false).order("name"),
    supabase.from("rosters").select("*").eq("is_archived", false),
    supabase.from("game_lineups").select("*").eq("is_archived", false).order("created_at", { ascending: false }),
  ]);

  const team      = teamRaw   as Team        | null;
  const roster    = rosterRaw as Roster      | null;
  const lineup    = lineupRaw as GameLineup  | null;
  const allTeamsList   = (allTeams   ?? []) as Team[];
  const allRostersList = (allRosters ?? []) as Roster[];
  const allLineupsList = (allLineups ?? []) as GameLineup[];

  const { data: { user } } = await supabase.auth.getUser();
  const userRole: TeamRole = (user && event.team_id)
    ? ((await getUserTeamRole(supabase, user.id, event.team_id)) ?? "viewer")
    : "viewer";

  // Load roster players + availability for the availability panel
  let rosterPlayers: Player[] = [];
  let availability: EventAvailability[] = [];

  if (event.roster_id) {
    const { data: players } = await supabase
      .from("players")
      .select("*")
      .eq("roster_id", event.roster_id)
      .eq("is_active", true)
      .order("last_name", { ascending: true });
    rosterPlayers = (players ?? []) as Player[];

    const { data: avail } = await supabase
      .from("event_availability")
      .select("*")
      .eq("event_id", event.id);
    availability = (avail ?? []) as EventAvailability[];
  }

  // Load RSVPs — current user's own + all for coaches
  const [{ data: myRsvpRaw }, { data: allRsvpsRaw }] = await Promise.all([
    user
      ? supabase
          .from("event_rsvps")
          .select("*")
          .eq("event_id", event.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("event_rsvps")
      .select("*")
      .eq("event_id", event.id),
  ]);

  const myRsvp   = (myRsvpRaw   ?? null) as EventRsvp | null;
  const allRsvps = (allRsvpsRaw ?? [])   as EventRsvp[];

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
          {/* Type badge + status chips */}
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
            lineups={allLineupsList}
            userRole={userRole}
          />
        </div>
      </div>

      {/* ── Content sections ── */}
      <div className="flex flex-col gap-6">
        {/* RSVP — visible to all authenticated users */}
        <div>
          <h2 className="mb-3 text-base font-semibold">RSVP</h2>
          <EventRsvpPanel
            eventId={event.id}
            myRsvp={myRsvp}
            allRsvps={allRsvps}
            userRole={event.user_id === user?.id ? "owner" : userRole}
            userId={user?.id ?? null}
          />
        </div>

        {/* Linked lineup — prominent card for game/scrimmage */}
        {(event.type === "game" || event.type === "scrimmage") && (
          <div>
            <h2 className="mb-3 text-base font-semibold">Game lineup</h2>
            {lineup ? (
              <Link
                href={`/lineups/${lineup.id}`}
                className="group flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <LayoutList className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold group-hover:text-primary transition-colors">
                      {lineup.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lineup.inning_count} inning{lineup.inning_count !== 1 ? "s" : ""}
                      {lineup.game_date && ` · ${formatDateShort(lineup.game_date)}`}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                <LayoutList className="h-7 w-7 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No lineup linked to this event.</p>
                <p className="text-xs text-muted-foreground">
                  Edit this event to link a game lineup.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {event.notes && (
          <div>
            <h2 className="mb-3 text-base font-semibold">Notes</h2>
            <div className="rounded-lg border border-border bg-muted/30 p-5">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.notes}</p>
            </div>
          </div>
        )}

        {/* Player availability (shown when a roster is linked) */}
        <div>
          <h2 className="mb-3 text-base font-semibold">Player availability</h2>
          <EventAvailabilityPanel
            eventId={event.id}
            players={rosterPlayers}
            availability={availability}
            userRole={event.user_id === user?.id ? "owner" : userRole}
          />
        </div>
      </div>
    </div>
  );
}
