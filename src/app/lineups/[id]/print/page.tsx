import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { LineupPrintCard } from "@/components/lineups/lineup-print-card";
import type { EventAvailability, TeamEvent } from "@/lib/constants/events";
import type { GameLineup, LineupEntry, Player, Roster, Team } from "@/lib/constants/teams";

type Props = { params: Promise<{ id: string }> };

export default async function LineupPrintPage({ params }: Props) {
  const { id }      = await params;
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const { data: lineupRaw } = await supabase
    .from("game_lineups")
    .select("*")
    .eq("id", id)
    .single();

  if (!lineupRaw) notFound();
  const lineup = lineupRaw as GameLineup;

  const [
    { data: entriesRaw },
    { data: teamRaw },
    { data: rosterRaw },
    { data: eventRaw },
  ] = await Promise.all([
    supabase
      .from("lineup_entries")
      .select("*")
      .eq("lineup_id", id)
      .order("batting_order", { ascending: true }),
    lineup.team_id
      ? supabase.from("teams").select("*").eq("id", lineup.team_id).single()
      : Promise.resolve({ data: null }),
    lineup.roster_id
      ? supabase.from("rosters").select("*").eq("id", lineup.roster_id).single()
      : Promise.resolve({ data: null }),
    // Find the event that references this lineup (if any)
    supabase
      .from("events")
      .select("*")
      .eq("lineup_id", id)
      .eq("is_archived", false)
      .limit(1)
      .maybeSingle(),
  ]);

  const entries = (entriesRaw ?? []) as LineupEntry[];
  const team    = teamRaw   as Team   | null;
  const roster  = rosterRaw as Roster | null;
  const event   = eventRaw  as TeamEvent | null;

  // Load roster players to build bench section
  let rosterPlayers: Player[] = [];
  let availability: EventAvailability[] = [];

  if (lineup.roster_id) {
    const { data: players } = await supabase
      .from("players")
      .select("*")
      .eq("roster_id", lineup.roster_id)
      .eq("is_active", true)
      .order("last_name", { ascending: true });
    rosterPlayers = (players ?? []) as Player[];
  }

  if (event?.id) {
    const { data: avail } = await supabase
      .from("event_availability")
      .select("*")
      .eq("event_id", event.id);
    availability = (avail ?? []) as EventAvailability[];
  }

  return (
    <LineupPrintCard
      lineup={lineup}
      entries={entries}
      team={team}
      roster={roster}
      event={event}
      rosterPlayers={rosterPlayers}
      availability={availability}
    />
  );
}
