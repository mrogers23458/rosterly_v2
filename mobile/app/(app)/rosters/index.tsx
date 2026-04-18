import { useCallback, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { Badge } from "@/components/ui/Badge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAB } from "@/components/ui/FAB";
import { FormField } from "@/components/ui/FormField";
import {
  archiveRoster, createRoster, deleteRoster, fetchRosters, fetchTeams,
  type Roster, type Team,
} from "@/lib/supabase-queries";
import { ImportModal } from "@/components/import/ImportModal";

const BRAND = "#2563eb";

export default function RostersScreen() {
  const router = useRouter();
  const [rosters, setRosters]       = useState<Roster[]>([]);
  const [teams, setTeams]           = useState<Team[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTeam, setFilterTeam] = useState<string | null>(null);

  // Form
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [name, setName]             = useState("");
  const [teamId, setTeamId]         = useState("");
  const [season, setSeason]         = useState("");
  const [year, setYear]             = useState("");
  const [notes, setNotes]           = useState("");

  // Actions
  const [selected, setSelected]     = useState<Roster | null>(null);
  const [actionOpen, setActionOpen] = useState(false);

  // Import
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    const [r, t] = await Promise.all([fetchRosters(filterTeam ?? undefined), fetchTeams()]);
    setRosters(r); setTeams(t);
    setLoading(false); setRefreshing(false);
  }, [filterTeam]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  function resetForm() { setName(""); setTeamId(""); setSeason(""); setYear(""); setNotes(""); }

  async function handleCreate() {
    if (!name.trim()) { Alert.alert("Required", "Roster name is required."); return; }
    setSaving(true);
    const res = await createRoster({
      name: name.trim(), team_id: teamId || null,
      season: season || undefined, year: year ? parseInt(year, 10) : undefined,
      notes: notes || undefined,
    });
    setSaving(false);
    if (!res) { Alert.alert("Error", "Failed to create roster."); return; }
    setSheetOpen(false); resetForm(); load();
  }

  async function handleArchive(r: Roster) {
    Alert.alert("Archive roster", `Archive "${r.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: async () => { await archiveRoster(r.id); load(); } },
    ]);
  }

  async function handleDelete(r: Roster) {
    Alert.alert("Delete roster", `Delete "${r.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteRoster(r.id); load(); } },
    ]);
  }

  function renderRoster({ item }: { item: Roster }) {
    return (
      <Pressable
        style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}
        onPress={() => router.push(`/(app)/rosters/${item.id}`)}
        onLongPress={() => { setSelected(item); setActionOpen(true); }}
        delayLongPress={350}
      >
        <View style={s.cardRow}>
          <View style={s.cardLeft}>
            <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
            {item.team?.name && <Text style={s.cardTeam}>{item.team.name}</Text>}
            <Text style={s.cardSub}>{[item.year, item.season].filter(Boolean).join(" · ")}</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </View>
        {item.notes && <Text style={s.cardNotes} numberOfLines={1}>{item.notes}</Text>}
      </Pressable>
    );
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={BRAND} /></View>;

  const displayed = filterTeam ? rosters.filter((r) => r.team_id === filterTeam) : rosters;

  return (
    <View style={s.flex}>
      {/* Team filter chips */}
      {teams.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={s.chipsContent}>
          <Pressable style={[s.chip, !filterTeam && s.chipActive]} onPress={() => setFilterTeam(null)}>
            <Text style={[s.chipTxt, !filterTeam && s.chipActiveTxt]}>All</Text>
          </Pressable>
          {teams.map((t) => (
            <Pressable key={t.id} style={[s.chip, filterTeam === t.id && s.chipActive]} onPress={() => setFilterTeam(t.id)}>
              <Text style={[s.chipTxt, filterTeam === t.id && s.chipActiveTxt]} numberOfLines={1}>{t.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={displayed}
        keyExtractor={(r) => r.id}
        renderItem={renderRoster}
        contentContainerStyle={[s.list, displayed.length === 0 && s.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<EmptyState emoji="📋" title="No rosters" subtitle="Tap + to create a roster or import from a file." />}
      />

      <FAB onPress={() => { resetForm(); setSheetOpen(true); }} />

      {/* Floating import button */}
      <Pressable style={s.importFAB} onPress={() => setImportOpen(true)}>
        <Text style={s.importFABTxt}>Import</Text>
      </Pressable>

      {/* Create roster sheet */}
      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="New roster" heightFraction={0.75}>
        <ScrollView style={s.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FormField label="Roster name *" value={name} onChangeText={setName} placeholder="e.g. 2025 Spring Roster" autoFocus />
          {teams.length > 0 && (
            <View style={s.teamPicker}>
              <Text style={s.teamPickerLabel}>Team (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable style={[s.teamChip, !teamId && s.teamChipActive]} onPress={() => setTeamId("")}>
                  <Text style={[s.teamChipTxt, !teamId && s.teamChipActiveTxt]}>None</Text>
                </Pressable>
                {teams.map((t) => (
                  <Pressable key={t.id} style={[s.teamChip, teamId === t.id && s.teamChipActive]} onPress={() => setTeamId(t.id)}>
                    <Text style={[s.teamChipTxt, teamId === t.id && s.teamChipActiveTxt]} numberOfLines={1}>{t.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          <FormField label="Season" value={season} onChangeText={setSeason} placeholder="Spring / Summer / Fall…" />
          <FormField label="Year" value={year} onChangeText={setYear} placeholder="2025" keyboardType="number-pad" maxLength={4} />
          <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" multiline numberOfLines={2} />
          <View style={{ height: 16 }} />
        </ScrollView>
        <View style={s.formBtns}>
          <Pressable style={s.cancelBtn} onPress={() => setSheetOpen(false)}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </Pressable>
          <Pressable style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Create roster</Text>}
          </Pressable>
        </View>
      </BottomSheet>

      <ActionSheet
        visible={actionOpen}
        onClose={() => setActionOpen(false)}
        title={selected?.name}
        actions={[
          { label: "View roster",  onPress: () => router.push(`/(app)/rosters/${selected!.id}`) },
          { label: "Archive",      onPress: () => handleArchive(selected!) },
          { label: "Delete",       destructive: true, onPress: () => handleDelete(selected!) },
        ]}
      />

      <ImportModal
        visible={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { setImportOpen(false); load(); }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  flex:             { flex: 1, backgroundColor: "#f9fafb" },
  center:           { flex: 1, alignItems: "center", justifyContent: "center" },
  chips:            { maxHeight: 52, backgroundColor: "#fff", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb" },
  chipsContent:     { paddingHorizontal: 12, paddingVertical: 10, gap: 6, flexDirection: "row" },
  chip:             { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: "#f3f4f6", marginRight: 6 },
  chipActive:       { backgroundColor: BRAND },
  chipTxt:          { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  chipActiveTxt:    { color: "#fff", fontWeight: "600" },
  list:             { padding: 16, paddingBottom: 100 },
  listEmpty:        { flex: 1 },
  card:             { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardRow:          { flexDirection: "row", alignItems: "flex-start" },
  cardLeft:         { flex: 1 },
  cardName:         { fontSize: 17, fontWeight: "700", color: "#111" },
  cardTeam:         { fontSize: 13, color: BRAND, fontWeight: "500", marginTop: 2 },
  cardSub:          { fontSize: 13, color: "#6b7280", marginTop: 2 },
  cardNotes:        { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  chevron:          { fontSize: 20, color: "#d1d5db", marginTop: 2 },
  importFAB:        { position: "absolute", bottom: 24, right: 84, backgroundColor: "#fff", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1.5, borderColor: BRAND, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  importFABTxt:     { color: BRAND, fontWeight: "600", fontSize: 14 },
  form:             { paddingHorizontal: 20, paddingTop: 8 },
  teamPicker:       { marginBottom: 14 },
  teamPickerLabel:  { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  teamChip:         { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#f3f4f6", marginRight: 6 },
  teamChipActive:   { backgroundColor: BRAND },
  teamChipTxt:      { fontSize: 13, color: "#6b7280", maxWidth: 120 },
  teamChipActiveTxt:{ color: "#fff", fontWeight: "600" },
  formBtns:         { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  cancelBtn:        { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb" },
  cancelTxt:        { fontSize: 15, fontWeight: "600", color: "#374151" },
  saveBtn:          { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: BRAND },
  saveTxt:          { fontSize: 15, fontWeight: "700", color: "#fff" },
});
