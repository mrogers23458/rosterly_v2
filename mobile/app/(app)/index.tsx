import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [counts, setCounts] = useState({ teams: 0, rosters: 0, lineups: 0, events: 0, players: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const [t, r, l, e, rIds] = await Promise.all([
      sb.from("teams").select("id", { count: "exact", head: true }).eq("is_archived", false),
      sb.from("rosters").select("id", { count: "exact", head: true }).eq("is_archived", false),
      sb.from("game_lineups").select("id", { count: "exact", head: true }).eq("is_archived", false),
      sb.from("events").select("id", { count: "exact", head: true }).eq("is_archived", false),
      sb.from("rosters").select("id").eq("is_archived", false),
    ]);
    let players = 0;
    const ids = (rIds.data ?? []).map((x: { id: string }) => x.id);
    if (ids.length > 0) {
      const { count } = await sb.from("players").select("id", { count: "exact", head: true }).in("roster_id", ids);
      players = count ?? 0;
    }
    setCounts({ teams: t.count ?? 0, rosters: r.count ?? 0, lineups: l.count ?? 0, events: e.count ?? 0, players });
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" /></View>;

  return (
    <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
      <Text style={s.h1}>Rosterly</Text>
      <Text style={s.email}>{user?.email}</Text>
      <View style={s.card}>
        <Text style={s.cardTitle}>At a glance</Text>
        {(Object.entries(counts) as [string, number][]).map(([k, v]) => (
          <View key={k} style={s.row}>
            <Text style={s.label}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
            <Text style={s.val}>{v}</Text>
          </View>
        ))}
      </View>
      <Text style={s.hint}>Use the tabs below to browse teams, rosters, lineups, players, and events. Data syncs with your web account.</Text>
      <Pressable style={s.out} onPress={() => signOut()}><Text style={s.outTxt}>Sign out</Text></Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 26, fontWeight: "700" },
  email: { fontSize: 14, color: "#666", marginTop: 4, marginBottom: 20 },
  card: { backgroundColor: "#f4f4f5", borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#ddd" },
  label: { fontSize: 15, color: "#333" }, val: { fontSize: 15, fontWeight: "600" },
  hint: { fontSize: 14, color: "#666", lineHeight: 20, marginBottom: 24 },
  out: { alignSelf: "flex-start", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: "#ccc" },
  outTxt: { fontSize: 15, fontWeight: "600", color: "#b91c1c" },
});
