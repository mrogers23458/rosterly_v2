import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { LineupPrintCard } from "@/components/lineups/lineup-print-card";
import type { EventAvailability, TeamEvent } from "@/lib/constants/events";
import type { GameLineup, LineupEntry, Player, Roster, Team } from "@/lib/constants/teams";

type Props = { params: Promise<{ token: string }> };

export default async function SharedLineupPage({ params }: Props) {
  const { token }   = await params;
  const cookieStore = await cookies();
  // Use the anon client — no auth required for a shared lineup
  const supabase    = createClient(cookieStore);

  const { data: lineupRaw } = await supabase
    .from("game_lineups")
    .select("*")
    .eq("share_token", token)
    .eq("is_archived", false)
    .maybeSingle();

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
      .eq("lineup_id", lineup.id)
      .order("batting_order", { ascending: true }),
    lineup.team_id
      ? supabase.from("teams").select("*").eq("id", lineup.team_id).single()
      : Promise.resolve({ data: null }),
    lineup.roster_id
      ? supabase.from("rosters").select("*").eq("id", lineup.roster_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("events")
      .select("*")
      .eq("lineup_id", lineup.id)
      .eq("is_archived", false)
      .limit(1)
      .maybeSingle(),
  ]);

  const entries = (entriesRaw ?? []) as LineupEntry[];
  const team    = teamRaw   as Team      | null;
  const roster  = rosterRaw as Roster    | null;
  const event   = eventRaw  as TeamEvent | null;

  return (
    <LineupPrintCard
      lineup={lineup}
      entries={entries}
      team={team}
      roster={roster}
      event={event}
      rosterPlayers={[] as Player[]}
      availability={[] as EventAvailability[]}
    />
  );
}
