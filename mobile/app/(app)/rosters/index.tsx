import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { getSupabase } from "@/lib/supabase";
import type { Roster, Team } from "@/lib/types";

type Row = Roster & { team?: Team | null };

export default function RostersListScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data: rs } = await sb.from("rosters").select("*").eq("is_archived", false).order("created_at", { ascending: false });
    const list = (rs ?? []) as Roster[];
    const teamIds = [...new Set(list.map((r) => r.team_id).filter(Boolean))] as string[];
    let teamMap: Record<string, Team> = {};
    if (teamIds.length > 0) {
      const { data: ts } = await sb.from("teams").select("*").in("id", teamIds);
      teamMap = Object.fromEntries(((ts ?? []) as Team[]).map((t) => [t.id, t]));
    }
    setRows(list.map((r) => ({ ...r, team: r.team_id ? teamMap[r.team_id] ?? null : null })));
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  if (loading) return <View style={s.center}><ActivityIndicator size="large" /></View>;

  return (
    <FlatList
      data={rows}
      keyExtractor={(i) => i.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      ListEmptyComponent={<Text style={s.empty}>No rosters.</Text>}
      contentContainerStyle={s.list}
      renderItem={({ item }) => (
        <Link href={`/rosters/${item.id}`} asChild>
          <Pressable style={s.row}>
            <Text style={s.name}>{item.name}</Text>
            <Text style={s.meta}>{item.team?.name ?? "No team"} · {item.season} {item.year}</Text>
          </Pressable>
        </Link>
      )}
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16 },
  row: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e5e5", marginBottom: 10 },
  name: { fontSize: 17, fontWeight: "600" }, meta: { fontSize: 13, color: "#666", marginTop: 4 },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
});
