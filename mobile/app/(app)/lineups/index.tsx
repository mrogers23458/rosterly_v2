import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { getSupabase } from "@/lib/supabase";
import type { GameLineup, Team } from "@/lib/types";

type Row = GameLineup & { team?: Team | null };

export default function LineupsListScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data: ls } = await sb.from("game_lineups").select("*").eq("is_archived", false).order("created_at", { ascending: false });
    const list = (ls ?? []) as GameLineup[];
    const teamIds = [...new Set(list.map((l) => l.team_id).filter(Boolean))] as string[];
    let teamMap: Record<string, Team> = {};
    if (teamIds.length > 0) {
      const { data: ts } = await sb.from("teams").select("*").in("id", teamIds);
      teamMap = Object.fromEntries(((ts ?? []) as Team[]).map((t) => [t.id, t]));
    }
    setRows(list.map((l) => ({ ...l, team: l.team_id ? teamMap[l.team_id] ?? null : null })));
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  if (loading) return <View style={s.center}><ActivityIndicator size="large" /></View>;

  return (
    <FlatList
      data={rows}
      keyExtractor={(i) => i.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      ListEmptyComponent={<Text style={s.empty}>No lineups.</Text>}
      contentContainerStyle={s.list}
      renderItem={({ item }) => (
        <Link href={`/lineups/${item.id}`} asChild>
          <Pressable style={s.row}>
            <Text style={s.name}>{item.name}</Text>
            <Text style={s.meta}>{item.team?.name ?? "Team"} · {item.game_date ?? "No date"} · {item.inning_count} inn.</Text>
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
