import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ROLE_LABELS, fetchTeamRolesMap, type TeamRole } from "@/lib/roles";
import { getSupabase } from "@/lib/supabase";
import type { GameLineup, Roster, Team } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [lineups, setLineups] = useState<GameLineup[]>([]);
  const [role, setRole] = useState<TeamRole | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user || !id) return;
    const [{ data: t }, { data: r }, { data: l }, map] = await Promise.all([
      sb.from("teams").select("*").eq("id", id).maybeSingle(),
      sb.from("rosters").select("*").eq("team_id", id).order("created_at", { ascending: false }),
      sb.from("game_lineups").select("*").eq("team_id", id).order("created_at", { ascending: false }),
      fetchTeamRolesMap(sb, user.id),
    ]);
    setTeam((t ?? null) as Team | null);
    setRosters((r ?? []) as Roster[]);
    setLineups(((l ?? []) as GameLineup[]).filter((x) => !x.is_archived));
    setRole(map[id] ?? null);
    setLoading(false);
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" /></View>;
  if (!team) return <View style={s.pad}><Text style={s.muted}>Team not found.</Text></View>;

  return (
    <>
      <Stack.Screen options={{ title: team.name }} />
      <ScrollView contentContainerStyle={s.pad}>
        <Text style={s.role}>{role ? ROLE_LABELS[role] : "Member"}</Text>
        <Text style={s.meta}>{team.season} {team.year} · {team.division} · {team.age_group}</Text>
        {team.organization ? <Text style={s.meta}>{team.organization}</Text> : null}
        <Text style={s.section}>Rosters</Text>
        {rosters.filter((r) => !r.is_archived).length === 0 ? <Text style={s.muted}>No rosters</Text>
          : rosters.filter((r) => !r.is_archived).map((r) => (
            <Link key={r.id} href={`/rosters/${r.id}`} asChild>
              <Pressable style={s.card}><Text style={s.cardTitle}>{r.name}</Text><Text style={s.muted}>{r.season} {r.year}</Text></Pressable>
            </Link>
          ))}
        <Text style={s.section}>Lineups</Text>
        {lineups.length === 0 ? <Text style={s.muted}>No lineups</Text>
          : lineups.map((l) => (
            <Link key={l.id} href={`/lineups/${l.id}`} asChild>
              <Pressable style={s.card}><Text style={s.cardTitle}>{l.name}</Text><Text style={s.muted}>{l.game_date ?? "No date"}</Text></Pressable>
            </Link>
          ))}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  pad: { padding: 16, paddingBottom: 32 },
  role: { fontSize: 14, color: "#2563eb", fontWeight: "600", marginBottom: 4 },
  meta: { fontSize: 15, color: "#444" },
  section: { fontSize: 18, fontWeight: "600", marginTop: 24, marginBottom: 10 },
  card: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#e5e5e5", marginBottom: 8, backgroundColor: "#fff" },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  muted: { fontSize: 14, color: "#888" },
});
