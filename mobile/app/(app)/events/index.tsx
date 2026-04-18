import { Link } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { getSupabase } from "@/lib/supabase";
import { EVENT_TYPE_LABEL, type Team, type TeamEvent } from "@/lib/types";

type Row = TeamEvent & { team?: Team | null };

export default function EventsListScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data: evs } = await sb.from("events").select("*").eq("is_archived", false).order("event_date").order("start_time");
    const list = (evs ?? []) as TeamEvent[];
    const teamIds = [...new Set(list.map((e) => e.team_id).filter(Boolean))] as string[];
    let teamMap: Record<string, Team> = {};
    if (teamIds.length > 0) {
      const { data: ts } = await sb.from("teams").select("*").in("id", teamIds);
      teamMap = Object.fromEntries(((ts ?? []) as Team[]).map((x) => [x.id, x]));
    }
    setRows(list.map((e) => ({ ...e, team: e.team_id ? teamMap[e.team_id] ?? null : null })));
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sections = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [
      { title: "Upcoming", data: rows.filter((r) => r.event_date >= today) },
      { title: "Past",     data: rows.filter((r) => r.event_date < today) },
    ];
  }, [rows]);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" /></View>;

  return (
    <FlatList
      data={sections}
      keyExtractor={(sec) => sec.title}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      contentContainerStyle={s.list}
      renderItem={({ item: sec }) => (
        <View style={s.section}>
          <Text style={s.secTitle}>{sec.title}</Text>
          {sec.data.length === 0 ? <Text style={s.muted}>None</Text>
            : sec.data.map((ev) => (
              <Link key={ev.id} href={`/events/${ev.id}`} asChild>
                <Pressable style={s.row}>
                  <Text style={s.badge}>{EVENT_TYPE_LABEL[ev.type] ?? ev.type}</Text>
                  <Text style={s.name}>{ev.title}</Text>
                  <Text style={s.meta}>{ev.event_date}{ev.start_time ? ` · ${ev.start_time}` : ""}{ev.team ? ` · ${ev.team.name}` : ""}</Text>
                  {ev.location ? <Text style={s.loc}>{ev.location}</Text> : null}
                </Pressable>
              </Link>
            ))}
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 24 }, secTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  row: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e5e5e5", marginBottom: 8, backgroundColor: "#fff" },
  badge: { fontSize: 11, fontWeight: "700", color: "#2563eb", marginBottom: 4 },
  name: { fontSize: 16, fontWeight: "600" }, meta: { fontSize: 13, color: "#666", marginTop: 4 },
  loc: { fontSize: 13, color: "#888", marginTop: 2 }, muted: { fontSize: 14, color: "#999" },
});
