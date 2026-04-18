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
  archiveTeam, createTeam, deleteTeam, fetchTeams, type Team,
} from "@/lib/supabase-queries";
import { ImportModal } from "@/components/import/ImportModal";

const BRAND = "#2563eb";
const CURRENT_YEAR = new Date().getFullYear();

const TEAM_TYPES = ["Little League","Travel","Recreational","School","Tournament","Other"];
const SEASONS = ["Spring","Summer","Fall","Winter","Year-Round"];

export default function TeamsScreen() {
  const router = useRouter();
  const [teams, setTeams]           = useState<Team[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [name, setName]             = useState("");
  const [year, setYear]             = useState(String(CURRENT_YEAR));
  const [season, setSeason]         = useState("");
  const [division, setDivision]     = useState("");
  const [ageGroup, setAgeGroup]     = useState("");
  const [teamType, setTeamType]     = useState("");
  const [org, setOrg]               = useState("");

  // Action sheet
  const [selected, setSelected]     = useState<Team | null>(null);
  const [actionOpen, setActionOpen] = useState(false);

  // Import
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async (bg = false) => {
    if (!bg) setLoading(true);
    const data = await fetchTeams();
    setTeams(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function resetForm() {
    setName(""); setYear(String(CURRENT_YEAR)); setSeason("");
    setDivision(""); setAgeGroup(""); setTeamType(""); setOrg("");
  }

  async function handleCreate() {
    if (!name.trim()) { Alert.alert("Required", "Team name is required."); return; }
    const yr = parseInt(year, 10);
    if (isNaN(yr)) { Alert.alert("Required", "Enter a valid year."); return; }
    setSaving(true);
    const res = await createTeam({
      name: name.trim(), year: yr,
      season: season || undefined, division: division || undefined,
      age_group: ageGroup || undefined, team_type: teamType || undefined,
      organization: org || undefined,
    });
    setSaving(false);
    if (!res) { Alert.alert("Error", "Failed to create team. Please try again."); return; }
    setSheetOpen(false);
    resetForm();
    load(true);
  }

  async function handleArchive(team: Team) {
    Alert.alert("Archive team", `Archive "${team.name}"? You can restore it later.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: async () => {
        await archiveTeam(team.id);
        load(true);
      }},
    ]);
  }

  async function handleDelete(team: Team) {
    Alert.alert("Delete team", `Permanently delete "${team.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteTeam(team.id);
        load(true);
      }},
    ]);
  }

  function renderTeam({ item }: { item: Team }) {
    return (
      <Pressable
        style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}
        onPress={() => router.push(`/(app)/teams/${item.id}`)}
        onLongPress={() => { setSelected(item); setActionOpen(true); }}
        delayLongPress={350}
      >
        <View style={s.cardRow}>
          <View style={s.cardLeft}>
            <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={s.cardSub}>
              {[item.year, item.season, item.division].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <View style={s.cardRight}>
            {item.team_type && <Badge label={item.team_type} variant="blue" />}
          </View>
        </View>
        {item.organization && <Text style={s.cardOrg}>{item.organization}</Text>}
        <Text style={s.cardChevron}>›</Text>
      </Pressable>
    );
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={BRAND} /></View>;

  return (
    <View style={s.flex}>
      <FlatList
        data={teams}
        keyExtractor={(t) => t.id}
        renderItem={renderTeam}
        contentContainerStyle={[s.list, teams.length === 0 && s.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        ListEmptyComponent={
          <EmptyState emoji="⚾" title="No teams yet" subtitle="Tap + to create your first team or import from GameChanger, Google Sheets, or a photo." />
        }
        ListHeaderComponent={
          teams.length > 0 ? (
            <Pressable style={s.importBtn} onPress={() => setImportOpen(true)}>
              <Text style={s.importBtnTxt}>⬇ Import a team</Text>
            </Pressable>
          ) : null
        }
      />

      {/* FAB */}
      <View style={s.fabWrap}>
        <Pressable style={s.fabImport} onPress={() => setImportOpen(true)}>
          <Text style={s.fabImportTxt}>Import</Text>
        </Pressable>
        <FAB onPress={() => { resetForm(); setSheetOpen(true); }} />
      </View>

      {/* Create team sheet */}
      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="New team" heightFraction={0.82}>
        <ScrollView style={s.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FormField label="Team name *" value={name} onChangeText={setName} placeholder="e.g. River City Tigers" autoFocus />
          <FormField label="Year *" value={year} onChangeText={setYear} placeholder="2025" keyboardType="number-pad" maxLength={4} />
          <FormField label="Season" value={season} onChangeText={setSeason} placeholder="Spring / Summer / Fall…" />
          <FormField label="Division" value={division} onChangeText={setDivision} placeholder="e.g. AAA, Majors, 10U" />
          <FormField label="Age group" value={ageGroup} onChangeText={setAgeGroup} placeholder="e.g. 10U, 12U, 14U" />
          <FormField label="Team type" value={teamType} onChangeText={setTeamType} placeholder="Little League / Travel / Rec…" />
          <FormField label="Organization" value={org} onChangeText={setOrg} placeholder="e.g. Little League District 12" />
          <View style={{ height: 16 }} />
        </ScrollView>
        <View style={s.formBtns}>
          <Pressable style={s.cancelBtn} onPress={() => setSheetOpen(false)}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </Pressable>
          <Pressable style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Create team</Text>}
          </Pressable>
        </View>
      </BottomSheet>

      {/* Actions */}
      <ActionSheet
        visible={actionOpen}
        onClose={() => setActionOpen(false)}
        title={selected?.name}
        actions={[
          { label: "Edit team", onPress: () => router.push(`/(app)/teams/${selected!.id}?edit=1`) },
          { label: "Archive", onPress: () => handleArchive(selected!) },
          { label: "Delete", destructive: true, onPress: () => handleDelete(selected!) },
        ]}
      />

      {/* Import */}
      <ImportModal
        visible={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { setImportOpen(false); load(true); }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: "#f9fafb" },
  center:      { flex: 1, alignItems: "center", justifyContent: "center" },
  list:        { padding: 16, paddingBottom: 100 },
  listEmpty:   { flex: 1 },
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRow:     { flexDirection: "row", alignItems: "flex-start" },
  cardLeft:    { flex: 1, marginRight: 8 },
  cardRight:   { alignItems: "flex-end" },
  cardName:    { fontSize: 17, fontWeight: "700", color: "#111", marginBottom: 3 },
  cardSub:     { fontSize: 13, color: "#6b7280" },
  cardOrg:     { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  cardChevron: { position: "absolute", right: 0, top: "45%", fontSize: 20, color: "#d1d5db" },
  importBtn:   { backgroundColor: "#eff6ff", borderRadius: 10, padding: 12, marginBottom: 12, alignItems: "center" },
  importBtnTxt:{ fontSize: 14, color: BRAND, fontWeight: "600" },
  fabWrap:     { position: "absolute", bottom: 24, right: 20, flexDirection: "row", alignItems: "center", gap: 10 },
  fabImport: {
    backgroundColor: "#fff", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1.5, borderColor: BRAND,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  fabImportTxt:{ color: BRAND, fontWeight: "600", fontSize: 14 },
  form:        { paddingHorizontal: 20, paddingTop: 8 },
  formBtns:    { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  cancelBtn:   { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb" },
  cancelTxt:   { fontSize: 15, fontWeight: "600", color: "#374151" },
  saveBtn:     { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: BRAND },
  saveTxt:     { fontSize: 15, fontWeight: "700", color: "#fff" },
});
