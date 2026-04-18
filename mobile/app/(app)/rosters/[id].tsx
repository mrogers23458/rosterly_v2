import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getSupabase } from "@/lib/supabase";
import type { Player, Roster, Team } from "@/lib/types";

export default function RosterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [roster, setRoster] = useState<Roster | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !id) return;
    const { data: r } = await sb.from("rosters").select("*").eq("id", id).maybeSingle();
    const ro = (r ?? null) as Roster | null;
    setRoster(ro);
    if (ro?.team_id) {
      const { data: t } = await sb.from("teams").select("*").eq("id", ro.team_id).maybeSingle();
      setTeam((t ?? null) as Team | null);
    }
    const { data: p } = await sb.from("players").select("*").eq("roster_id", id).order("last_name");
    setPlayers((p ?? []) as Player[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <View style={s.center}><ActivityIndicator size="large" /></View>;
  if (!roster) return <View style={s.pad}><Text style={s.muted}>Roster not found.</Text></View>;

  return (
    <>
      <Stack.Screen options={{ title: roster.name }} />
      <ScrollView contentContainerStyle={s.pad}>
        <Text style={s.meta}>{team?.name ?? "No team"} · {roster.season} {roster.year}</Text>
        <Text style={s.section}>Players ({players.length})</Text>
        {players.length === 0 ? <Text style={s.muted}>No players</Text>
          : players.map((p) => (
            <View key={p.id} style={s.card}>
              <Text style={s.cardTitle}>{p.first_name} {p.last_name}{p.jersey_number ? ` · #${p.jersey_number}` : ""}</Text>
              {!p.is_active ? <Text style={s.inactive}>Inactive</Text> : null}
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
  meta: { fontSize: 15, color: "#444", marginBottom: 8 },
  section: { fontSize: 18, fontWeight: "600", marginTop: 16, marginBottom: 10 },
  card: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e5e5e5", marginBottom: 8, backgroundColor: "#fff" },
  cardTitle: { fontSize: 16, fontWeight: "500" }, inactive: { fontSize: 12, color: "#b45309", marginTop: 4 },
  muted: { fontSize: 14, color: "#888" }, link: { marginTop: 24, alignSelf: "flex-start" },
  linkTxt: { color: "#2563eb", fontSize: 16, fontWeight: "600" },
});
