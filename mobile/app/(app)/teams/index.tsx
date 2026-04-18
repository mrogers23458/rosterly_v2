import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { ROLE_LABELS, fetchTeamRolesMap, type TeamRole } from "@/lib/roles";
import { getSupabase } from "@/lib/supabase";
import type { Team } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";

export default function TeamsListScreen() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<Record<string, TeamRole>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    const { data } = await sb.from("teams").select("*").eq("is_archived", false).order("name");
    setTeams((data ?? []) as Team[]);
    setRoles(await fetchTeamRolesMap(sb, user.id));
    setLoading(false); setRefreshing(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" /></View>;

  return (
    <FlatList
      data={teams}
      keyExtractor={(i) => i.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      ListEmptyComponent={<Text style={s.empty}>No teams yet.</Text>}
      contentContainerStyle={s.list}
      renderItem={({ item }) => (
        <Link href={`/teams/${item.id}`} asChild>
          <Pressable style={s.row}>
            <Text style={s.name}>{item.name}</Text>
            <Text style={s.meta}>{item.season} {item.year} · {roles[item.id] ? ROLE_LABELS[roles[item.id]] : "Member"}</Text>
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
