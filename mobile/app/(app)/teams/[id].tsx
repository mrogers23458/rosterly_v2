import { useCallback, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { Badge } from "@/components/ui/Badge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAB } from "@/components/ui/FAB";
import { FormField } from "@/components/ui/FormField";
import {
  archiveTeam, deleteTeam, fetchRosters, fetchTeam, updateTeam,
  type Roster, type Team,
} from "@/lib/supabase-queries";

const BRAND = "#2563eb";

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const [team, setTeam]         = useState<Team | null>(null);
  const [rosters, setRosters]   = useState<Roster[]>([]);
  const [loading, setLoading]   = useState(true);

  // Edit sheet
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [name, setName]         = useState("");
  const [year, setYear]         = useState("");
  const [season, setSeason]     = useState("");
  const [division, setDivision] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [teamType, setTeamType] = useState("");
  const [org, setOrg]           = useState("");

  // Action sheet
  const [actionOpen, setActionOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [t, r] = await Promise.all([fetchTeam(id), fetchRosters(id)]);
    setTeam(t);
    setRosters(r);
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openEdit() {
    if (!team) return;
    setName(team.name);
    setYear(String(team.year));
    setSeason(team.season ?? "");
    setDivision(team.division ?? "");
    setAgeGroup(team.age_group ?? "");
    setTeamType(team.team_type ?? "");
    setOrg(team.organization ?? "");
    setEditOpen(true);
  }

  async function handleSave() {
    if (!team) return;
    if (!name.trim()) { Alert.alert("Required", "Team name is required."); return; }
    const yr = parseInt(year, 10);
    if (isNaN(yr)) { Alert.alert("Required", "Enter a valid year."); return; }
    setSaving(true);
    const ok = await updateTeam(team.id, {
      name: name.trim(), year: yr,
      season: season || undefined, division: division || undefined,
      age_group: ageGroup || undefined, team_type: teamType || undefined,
      organization: org || undefined,
    });
    setSaving(false);
    if (!ok) { Alert.alert("Error", "Failed to save changes."); return; }
    setEditOpen(false);
    load();
  }

  async function handleArchive() {
    if (!team) return;
    Alert.alert("Archive team", `Archive "${team.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: async () => {
        await archiveTeam(team.id);
        router.back();
      }},
    ]);
  }

  async function handleDelete() {
    if (!team) return;
    Alert.alert("Delete team", `Permanently delete "${team.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteTeam(team.id);
        router.back();
      }},
    ]);
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={BRAND} /></View>;
  if (!team)   return <View style={s.center}><Text style={s.err}>Team not found.</Text></View>;

  const meta: { label: string; value: string | undefined | null }[] = [
    { label: "Year",         value: String(team.year) },
    { label: "Season",       value: team.season },
    { label: "Division",     value: team.division },
    { label: "Age group",    value: team.age_group },
    { label: "Team type",    value: team.team_type },
    { label: "Organization", value: team.organization },
  ].filter((m) => m.value);

  return (
    <View style={s.flex}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <Text style={s.teamName}>{team.name}</Text>
            <Pressable style={s.editBtn} onPress={openEdit}>
              <Text style={s.editBtnTxt}>Edit</Text>
            </Pressable>
          </View>
          {meta.length > 0 && (
            <View style={s.metaRow}>
              {meta.map((m) => (
                <Badge key={m.label} label={`${m.value}`} variant="gray" />
              ))}
            </View>
          )}
        </View>

        {/* Rosters */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Rosters ({rosters.length})</Text>
            <Pressable onPress={() => router.push("/(app)/rosters")}>
              <Text style={s.sectionLink}>View all ›</Text>
            </Pressable>
          </View>
          {rosters.length === 0 ? (
            <EmptyState emoji="📋" title="No rosters" subtitle="Create a roster in the Rosters tab." />
          ) : (
            rosters.map((r) => (
              <Pressable
                key={r.id}
                style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}
                onPress={() => router.push(`/(app)/rosters/${r.id}`)}
              >
                <Text style={s.cardName}>{r.name}</Text>
                <Text style={s.cardSub}>{[r.year, r.season].filter(Boolean).join(" · ")}</Text>
              </Pressable>
            ))
          )}
        </View>

        {/* Danger zone */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Actions</Text>
          <Pressable style={s.dangerBtn} onPress={handleArchive}>
            <Text style={s.dangerTxt}>Archive team</Text>
          </Pressable>
          <Pressable style={[s.dangerBtn, s.deleteBtn]} onPress={handleDelete}>
            <Text style={[s.dangerTxt, { color: "#ef4444" }]}>Delete team</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Edit team sheet */}
      <BottomSheet visible={editOpen} onClose={() => setEditOpen(false)} title="Edit team" heightFraction={0.82}>
        <ScrollView style={s.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FormField label="Team name *" value={name} onChangeText={setName} />
          <FormField label="Year *" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
          <FormField label="Season" value={season} onChangeText={setSeason} placeholder="Spring / Summer / Fall…" />
          <FormField label="Division" value={division} onChangeText={setDivision} />
          <FormField label="Age group" value={ageGroup} onChangeText={setAgeGroup} />
          <FormField label="Team type" value={teamType} onChangeText={setTeamType} />
          <FormField label="Organization" value={org} onChangeText={setOrg} />
          <View style={{ height: 16 }} />
        </ScrollView>
        <View style={s.formBtns}>
          <Pressable style={s.cancelBtn} onPress={() => setEditOpen(false)}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </Pressable>
          <Pressable style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Save changes</Text>}
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

const s = StyleSheet.create({
  flex:          { flex: 1, backgroundColor: "#f9fafb" },
  center:        { flex: 1, alignItems: "center", justifyContent: "center" },
  err:           { color: "#6b7280", fontSize: 16 },
  scroll:        { padding: 16, paddingBottom: 48 },
  header:        { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  headerRow:     { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  teamName:      { fontSize: 22, fontWeight: "800", color: "#111", flex: 1, marginRight: 8 },
  editBtn:       { backgroundColor: "#eff6ff", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnTxt:    { color: BRAND, fontWeight: "600", fontSize: 14 },
  metaRow:       { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  section:       { marginBottom: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionTitle:  { fontSize: 15, fontWeight: "700", color: "#374151" },
  sectionLink:   { fontSize: 14, color: BRAND },
  card:          { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardName:      { fontSize: 16, fontWeight: "600", color: "#111" },
  cardSub:       { fontSize: 13, color: "#6b7280", marginTop: 2 },
  dangerBtn:     { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: "#e5e7eb", alignItems: "center" },
  deleteBtn:     { borderColor: "#fecaca" },
  dangerTxt:     { fontSize: 15, fontWeight: "600", color: "#374151" },
  form:          { paddingHorizontal: 20, paddingTop: 8 },
  formBtns:      { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  cancelBtn:     { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb" },
  cancelTxt:     { fontSize: 15, fontWeight: "600", color: "#374151" },
  saveBtn:       { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: BRAND },
  saveTxt:       { fontSize: 15, fontWeight: "700", color: "#fff" },
});
