import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getSupabase } from "@/lib/supabase";
import type { GameLineup, LineupEntryRow, Roster, Team } from "@/lib/types";

export default function LineupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lineup, setLineup] = useState<GameLineup | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [entries, setEntries] = useState<LineupEntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !id) return;
    const { data: l } = await sb.from("game_lineups").select("*").eq("id", id).maybeSingle();
    const lu = (l ?? null) as GameLineup | null;
    setLineup(lu);
    if (lu?.team_id) { const { data: t } = await sb.from("teams").select("*").eq("id", lu.team_id).maybeSingle(); setTeam((t ?? null) as Team | null); }
    if (lu?.roster_id) { const { data: r } = await sb.from("rosters").select("*").eq("id", lu.roster_id).maybeSingle(); setRoster((r ?? null) as Roster | null); }
    const { data: e } = await sb.from("lineup_entries").select("*").eq("lineup_id", id).order("batting_order");
    setEntries((e ?? []) as LineupEntryRow[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <View style={s.center}><ActivityIndicator size="large" /></View>;
  if (!lineup) return <View style={s.pad}><Text style={s.muted}>Lineup not found.</Text></View>;

  const n = lineup.inning_count || 6;
  return (
    <>
      <Stack.Screen options={{ title: lineup.name }} />
      <ScrollView contentContainerStyle={s.pad}>
        <Text style={s.meta}>{team?.name ?? "Team"} · {lineup.game_date ?? "No date"} · {n} innings</Text>
        {roster ? <Text style={s.meta}>Roster: {roster.name}</Text> : null}
        {lineup.notes ? <Text style={s.notes}>{lineup.notes}</Text> : null}
        <Text style={s.section}>Batting order</Text>
        {entries.length === 0 ? <Text style={s.muted}>No rows</Text>
          : entries.map((row) => (
            <View key={row.id} style={s.card}>
              <Text style={s.cardTitle}>{row.batting_order}. {row.player_name}{row.jersey_number ? ` (#${row.jersey_number})` : ""}</Text>
              <Text style={s.innings} numberOfLines={2}>
                {(row.innings ?? []).slice(0, n).map((pos: string, i: number) => `I${i + 1}:${pos}`).join(" · ")}
              </Text>
            </View>
          ))}
        {team ? <Link href={`/teams/${team.id}`} asChild><Pressable style={s.link}><Text style={s.linkTxt}>View team</Text></Pressable></Link> : null}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  pad: { padding: 16, paddingBottom: 32 },
  meta: { fontSize: 15, color: "#444", marginBottom: 4 },
  notes: { fontSize: 14, color: "#555", marginTop: 8, fontStyle: "italic" },
  section: { fontSize: 18, fontWeight: "600", marginTop: 20, marginBottom: 10 },
  card: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e5e5e5", marginBottom: 8, backgroundColor: "#fff" },
  cardTitle: { fontSize: 16, fontWeight: "600" }, innings: { fontSize: 12, color: "#666", marginTop: 6 },
  muted: { fontSize: 14, color: "#888" }, link: { marginTop: 24, alignSelf: "flex-start" },
  linkTxt: { color: "#2563eb", fontSize: 16, fontWeight: "600" },
});
