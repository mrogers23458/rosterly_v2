import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getSupabase } from "@/lib/supabase";
import { EVENT_TYPE_LABEL, type GameLineup, type Team, type TeamEvent } from "@/lib/types";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ev, setEv] = useState<TeamEvent | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [lineup, setLineup] = useState<GameLineup | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !id) return;
    const { data: row } = await sb.from("events").select("*").eq("id", id).maybeSingle();
    const event = (row ?? null) as TeamEvent | null;
    setEv(event);
    if (event?.team_id) { const { data: t } = await sb.from("teams").select("*").eq("id", event.team_id).maybeSingle(); setTeam((t ?? null) as Team | null); }
    if (event?.lineup_id) { const { data: l } = await sb.from("game_lineups").select("*").eq("id", event.lineup_id).maybeSingle(); setLineup((l ?? null) as GameLineup | null); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <View style={s.center}><ActivityIndicator size="large" /></View>;
  if (!ev) return <View style={s.pad}><Text style={s.muted}>Event not found.</Text></View>;

  return (
    <>
      <Stack.Screen options={{ title: ev.title }} />
      <ScrollView contentContainerStyle={s.pad}>
        <Text style={s.badge}>{EVENT_TYPE_LABEL[ev.type] ?? ev.type}</Text>
        <Text style={s.meta}>{ev.event_date}{ev.start_time ? ` · ${ev.start_time}` : ""}{ev.end_time ? ` – ${ev.end_time}` : ""}</Text>
        {ev.opponent ? <Text style={s.sub}>vs {ev.opponent}</Text> : null}
        {team ? <Text style={s.sub}>Team: {team.name}</Text> : null}
        {ev.location ? <Text style={s.sub}>📍 {ev.location}</Text> : null}
        {ev.notes ? <Text style={s.notes}>{ev.notes}</Text> : null}
        {lineup ? (
          <View style={s.box}>
            <Text style={s.secTitle}>Linked lineup</Text>
            <Link href={`/lineups/${lineup.id}`} asChild>
              <Pressable><Text style={s.link}>{lineup.name}</Text><Text style={s.muted}>{lineup.game_date ?? "No date"}</Text></Pressable>
            </Link>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  pad: { padding: 16, paddingBottom: 32 },
  badge: { fontSize: 13, fontWeight: "700", color: "#2563eb", marginBottom: 8 },
  meta: { fontSize: 16, color: "#333", marginBottom: 4 }, sub: { fontSize: 15, color: "#555", marginTop: 6 },
  notes: { fontSize: 15, color: "#444", marginTop: 16, lineHeight: 22 },
  secTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  box: { marginTop: 24, padding: 14, borderRadius: 10, backgroundColor: "#f4f4f5" },
  link: { fontSize: 17, fontWeight: "600", color: "#2563eb" }, muted: { fontSize: 13, color: "#666", marginTop: 4 },
});
