import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { getSupabase } from "@/lib/supabase";
import type { Player, Roster, Team } from "@/lib/types";

type Enriched = Player & { roster?: Roster | null; team?: Team | null };

export default function PlayersScreen() {
  const [players, setPlayers] = useState<Enriched[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data: rs } = await sb.from("rosters").select("*").eq("is_archived", false);
    const rosters = (rs ?? []) as Roster[];
    const rIds = rosters.map((r) => r.id);
    let list: Player[] = [];
    if (rIds.length > 0) {
      const { data: p } = await sb.from("players").select("*").in("roster_id", rIds).order("last_name");
      list = (p ?? []) as Player[];
    }
    const teamIds = [...new Set(rosters.map((r) => r.team_id).filter(Boolean))] as string[];
    let teamMap: Record<string, Team> = {};
    if (teamIds.length > 0) {
      const { data: ts } = await sb.from("teams").select("*").in("id", teamIds);
      teamMap = Object.fromEntries(((ts ?? []) as Team[]).map((t) => [t.id, t]));
    }
    const rMap = Object.fromEntries(rosters.map((r) => [r.id, r]));
    setPlayers(list.map((pl) => {
      const ro = rMap[pl.roster_id] ?? null;
      return { ...pl, roster: ro, team: ro?.team_id ? teamMap[ro.team_id] ?? null : null };
    }));
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.team?.name?.toLowerCase() ?? "").includes(q) ||
      (p.roster?.name?.toLowerCase() ?? "").includes(q),
    );
  }, [players, query]);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" /></View>;

  return (
    <FlatList
      data={filtered}
      keyExtractor={(i) => i.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      ListHeaderComponent={
        <TextInput style={s.search} placeholder="Search name, team, roster…" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} />
      }
      ListEmptyComponent={<Text style={s.empty}>No players match.</Text>}
      contentContainerStyle={s.list}
      renderItem={({ item }) => (
        <View style={s.row}>
          <Text style={s.name}>{item.first_name} {item.last_name}{item.jersey_number ? ` · #${item.jersey_number}` : ""}</Text>
          <Text style={s.meta}>{item.team?.name ?? "—"} · {item.roster?.name ?? "Roster"}</Text>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 32 },
  search: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: "#fff", marginBottom: 12 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#ddd" },
  name: { fontSize: 16, fontWeight: "600" }, meta: { fontSize: 13, color: "#666", marginTop: 4 },
  empty: { textAlign: "center", color: "#888", marginTop: 24 },
});
