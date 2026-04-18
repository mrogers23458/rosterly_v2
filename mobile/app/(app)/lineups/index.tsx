import { useCallback, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAB } from "@/components/ui/FAB";
import { FormField } from "@/components/ui/FormField";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { archiveLineup, createLineup, fetchLineups, fetchRosters, fetchTeams, type GameLineup, type Roster, type Team } from "@/lib/supabase-queries";

const BRAND = "#2563eb";

export default function LineupsScreen() {
  const router = useRouter();
  const [lineups, setLineups]       = useState<GameLineup[]>([]);
  const [teams, setTeams]           = useState<Team[]>([]);
  const [rosters, setRosters]       = useState<Roster[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sheetOpen, setSheetOpen]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [name, setName]             = useState("");
  const [teamId, setTeamId]         = useState("");
  const [rosterId, setRosterId]     = useState("");
  const [gameDate, setGameDate]     = useState("");
  const [notes, setNotes]           = useState("");

  const [selected, setSelected]     = useState<GameLineup | null>(null);
  const [actionOpen, setActionOpen] = useState(false);

  const load = useCallback(async () => {
    const [l, t, r] = await Promise.all([fetchLineups(), fetchTeams(), fetchRosters()]);
    setLineups(l); setTeams(t); setRosters(r);
    setLoading(false); setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  async function handleCreate() {
    if (!name.trim()) { Alert.alert("Required", "Lineup name is required."); return; }
    setSaving(true);
    await createLineup({
      name: name.trim(), team_id: teamId || null, roster_id: rosterId || null,
      game_date: gameDate || null, notes: notes || undefined,
    });
    setSaving(false); setSheetOpen(false);
    setName(""); setTeamId(""); setRosterId(""); setGameDate(""); setNotes("");
    load();
  }

  function renderLineup({ item }: { item: GameLineup }) {
    return (
      <Pressable
        style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}
        onPress={() => router.push(`/(app)/lineups/${item.id}`)}
        onLongPress={() => { setSelected(item); setActionOpen(true); }}
        delayLongPress={350}
      >
        <Text style={s.name}>{item.name}</Text>
        {item.team?.name && <Text style={s.sub}>{item.team.name}</Text>}
        <Text style={s.meta}>
          {[item.game_date, item.roster?.name].filter(Boolean).join(" · ")}
        </Text>
        <Text style={s.chevron}>›</Text>
      </Pressable>
    );
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={BRAND} /></View>;

  return (
    <View style={s.flex}>
      <FlatList
        data={lineups}
        keyExtractor={(l) => l.id}
        renderItem={renderLineup}
        contentContainerStyle={[s.list, lineups.length === 0 && s.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<EmptyState emoji="📝" title="No lineups yet" subtitle="Tap + to create your first lineup." />}
      />

      <FAB onPress={() => setSheetOpen(true)} />

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="New lineup" heightFraction={0.75}>
        <ScrollView style={s.form} keyboardShouldPersistTaps="handled">
          <FormField label="Lineup name *" value={name} onChangeText={setName} placeholder="e.g. Game 1 vs Eagles" autoFocus />
          <FormField label="Game date" value={gameDate} onChangeText={setGameDate} placeholder="YYYY-MM-DD" />

          {teams.length > 0 && (
            <View style={s.pickerWrap}>
              <Text style={s.pickerLabel}>Team (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable style={[s.chip, !teamId && s.chipActive]} onPress={() => setTeamId("")}><Text style={[s.chipTxt, !teamId && s.chipActiveTxt]}>None</Text></Pressable>
                {teams.map((t) => (
                  <Pressable key={t.id} style={[s.chip, teamId === t.id && s.chipActive]} onPress={() => setTeamId(t.id)}>
                    <Text style={[s.chipTxt, teamId === t.id && s.chipActiveTxt]} numberOfLines={1}>{t.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {rosters.length > 0 && (
            <View style={s.pickerWrap}>
              <Text style={s.pickerLabel}>Roster (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable style={[s.chip, !rosterId && s.chipActive]} onPress={() => setRosterId("")}><Text style={[s.chipTxt, !rosterId && s.chipActiveTxt]}>None</Text></Pressable>
                {rosters.map((r) => (
                  <Pressable key={r.id} style={[s.chip, rosterId === r.id && s.chipActive]} onPress={() => setRosterId(r.id)}>
                    <Text style={[s.chipTxt, rosterId === r.id && s.chipActiveTxt]} numberOfLines={1}>{r.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <FormField label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={2} />
        </ScrollView>
        <View style={s.formBtns}>
          <Pressable style={s.cancelBtn} onPress={() => setSheetOpen(false)}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </Pressable>
          <Pressable style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Create lineup</Text>}
          </Pressable>
        </View>
      </BottomSheet>

      <ActionSheet
        visible={actionOpen}
        onClose={() => setActionOpen(false)}
        title={selected?.name}
        actions={[
          { label: "Archive", destructive: true, onPress: async () => { if (selected) { await archiveLineup(selected.id); load(); } } },
        ]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  flex:       { flex: 1, backgroundColor: "#f9fafb" },
  center:     { flex: 1, alignItems: "center", justifyContent: "center" },
  list:       { padding: 16, paddingBottom: 100 },
  listEmpty:  { flex: 1 },
  card:       { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  name:       { fontSize: 17, fontWeight: "700", color: "#111" },
  sub:        { fontSize: 13, color: BRAND, marginTop: 2, fontWeight: "500" },
  meta:       { fontSize: 13, color: "#6b7280", marginTop: 2 },
  chevron:    { position: "absolute", right: 16, top: "45%", fontSize: 20, color: "#d1d5db" },
  form:       { paddingHorizontal: 20, paddingTop: 8 },
  pickerWrap: { marginBottom: 14 },
  pickerLabel:{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  chip:       { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#f3f4f6", marginRight: 6 },
  chipActive: { backgroundColor: BRAND },
  chipTxt:    { fontSize: 13, color: "#6b7280", maxWidth: 120 },
  chipActiveTxt:{ color: "#fff", fontWeight: "600" },
  formBtns:   { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  cancelBtn:  { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb" },
  cancelTxt:  { fontSize: 15, fontWeight: "600", color: "#374151" },
  saveBtn:    { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: BRAND },
  saveTxt:    { fontSize: 15, fontWeight: "700", color: "#fff" },
});
