import { useCallback, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAB } from "@/components/ui/FAB";
import { FormField } from "@/components/ui/FormField";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { archiveEvent, createEvent, fetchEvents, fetchTeams, type TeamEvent, type Team } from "@/lib/supabase-queries";

const BRAND = "#2563eb";
const EVENT_TYPES = [
  { label: "All",       value: "" },
  { label: "Game",      value: "game" },
  { label: "Practice",  value: "practice" },
];

const EVENT_TYPE_OPTIONS = [
  { label: "Game",       value: "game" },
  { label: "Practice",   value: "practice" },
  { label: "Fundraiser", value: "fundraiser" },
  { label: "Other",      value: "other" },
];

const TYPE_BADGE: Record<string, "blue" | "green" | "yellow" | "gray"> = {
  game: "blue", practice: "green", fundraiser: "yellow", other: "gray",
};

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents]         = useState<TeamEvent[]>([]);
  const [teams, setTeams]           = useState<Team[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState("");

  const [sheetOpen, setSheetOpen]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [title, setTitle]           = useState("");
  const [eventType, setEventType]   = useState("game");
  const [eventDate, setEventDate]   = useState("");
  const [teamId, setTeamId]         = useState("");
  const [opponent, setOpponent]     = useState("");
  const [startTime, setStartTime]   = useState("");
  const [location, setLocation]     = useState("");
  const [notes, setNotes]           = useState("");

  const [selected, setSelected]     = useState<TeamEvent | null>(null);
  const [actionOpen, setActionOpen] = useState(false);

  const load = useCallback(async () => {
    const [e, t] = await Promise.all([fetchEvents(), fetchTeams()]);
    setEvents(e); setTeams(t);
    setLoading(false); setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  function resetForm() {
    setTitle(""); setEventType("game"); setEventDate("");
    setTeamId(""); setOpponent(""); setStartTime(""); setLocation(""); setNotes("");
  }

  async function handleCreate() {
    if (!title.trim()) { Alert.alert("Required", "Event title is required."); return; }
    if (!eventDate.trim()) { Alert.alert("Required", "Event date is required (YYYY-MM-DD)."); return; }
    setSaving(true);
    await createEvent({
      title: title.trim(), type: eventType, event_date: eventDate.trim(),
      team_id: teamId || null, opponent: opponent || undefined,
      start_time: startTime || undefined, location: location || undefined, notes: notes || undefined,
    });
    setSaving(false); setSheetOpen(false); resetForm(); load();
  }

  const displayed = filter ? events.filter((e) => e.type === filter) : events;

  function formatDate(d: string) {
    try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return d; }
  }

  function renderEvent({ item }: { item: TeamEvent }) {
    return (
      <Pressable
        style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}
        onPress={() => router.push(`/(app)/events/${item.id}`)}
        onLongPress={() => { setSelected(item); setActionOpen(true); }}
        delayLongPress={350}
      >
        <View style={s.cardLeft}>
          <View style={s.dateBox}>
            <Text style={s.dateDay}>{new Date(item.event_date + "T12:00:00").getDate()}</Text>
            <Text style={s.dateMon}>{new Date(item.event_date + "T12:00:00").toLocaleString("en-US", { month: "short" })}</Text>
          </View>
        </View>
        <View style={s.cardContent}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Badge label={item.type} variant={TYPE_BADGE[item.type] ?? "gray"} />
          </View>
          {item.opponent && <Text style={s.cardSub}>vs {item.opponent}</Text>}
          {(item.start_time || item.location) && (
            <Text style={s.cardMeta}>{[item.start_time, item.location].filter(Boolean).join(" · ")}</Text>
          )}
        </View>
      </Pressable>
    );
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={BRAND} /></View>;

  return (
    <View style={s.flex}>
      {/* Filter */}
      <View style={s.filterBar}>
        <SegmentedControl options={EVENT_TYPES} value={filter} onChange={setFilter} />
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(e) => e.id}
        renderItem={renderEvent}
        contentContainerStyle={[s.list, displayed.length === 0 && s.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<EmptyState emoji="📅" title="No events" subtitle="Tap + to schedule a game, practice, or fundraiser." />}
      />

      <FAB onPress={() => { resetForm(); setSheetOpen(true); }} />

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="New event" heightFraction={0.88}>
        <ScrollView style={s.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={s.pickerLabel}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {EVENT_TYPE_OPTIONS.map((o) => (
              <Pressable key={o.value} style={[s.typeChip, eventType === o.value && s.typeChipActive]} onPress={() => setEventType(o.value)}>
                <Text style={[s.typeChipTxt, eventType === o.value && s.typeChipActiveTxt]}>{o.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <FormField label="Title *" value={title} onChangeText={setTitle} placeholder="e.g. Game vs Eagles" autoFocus />
          <FormField label="Date * (YYYY-MM-DD)" value={eventDate} onChangeText={setEventDate} placeholder="2025-06-15" keyboardType="numbers-and-punctuation" />
          <FormField label="Start time" value={startTime} onChangeText={setStartTime} placeholder="3:00 PM" />
          {eventType === "game" && (
            <FormField label="Opponent" value={opponent} onChangeText={setOpponent} placeholder="e.g. Blue Jays" />
          )}
          <FormField label="Location" value={location} onChangeText={setLocation} placeholder="Field name or address" />

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

          <FormField label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={2} />
          <View style={{ height: 16 }} />
        </ScrollView>
        <View style={s.formBtns}>
          <Pressable style={s.cancelBtn} onPress={() => setSheetOpen(false)}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </Pressable>
          <Pressable style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Create event</Text>}
          </Pressable>
        </View>
      </BottomSheet>

      <ActionSheet
        visible={actionOpen}
        onClose={() => setActionOpen(false)}
        title={selected?.title}
        actions={[
          { label: "Archive", destructive: true, onPress: async () => { if (selected) { await archiveEvent(selected.id); load(); } } },
        ]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  flex:          { flex: 1, backgroundColor: "#f9fafb" },
  center:        { flex: 1, alignItems: "center", justifyContent: "center" },
  filterBar:     { paddingHorizontal: 16, paddingTop: 12, backgroundColor: "#fff", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb" },
  list:          { padding: 12, paddingBottom: 100 },
  listEmpty:     { flex: 1 },
  card:          { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: "row", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardLeft:      { marginRight: 14 },
  dateBox:       { width: 48, alignItems: "center", backgroundColor: "#eff6ff", borderRadius: 10, padding: 6 },
  dateDay:       { fontSize: 22, fontWeight: "800", color: BRAND },
  dateMon:       { fontSize: 11, fontWeight: "600", color: BRAND, textTransform: "uppercase" },
  cardContent:   { flex: 1 },
  cardTitleRow:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  cardTitle:     { fontSize: 16, fontWeight: "700", color: "#111", flex: 1 },
  cardSub:       { fontSize: 13, color: "#374151", fontWeight: "500" },
  cardMeta:      { fontSize: 12, color: "#6b7280", marginTop: 2 },
  form:          { paddingHorizontal: 20, paddingTop: 8 },
  pickerWrap:    { marginBottom: 14 },
  pickerLabel:   { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  typeChip:      { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#f3f4f6", marginRight: 8 },
  typeChipActive:{ backgroundColor: BRAND },
  typeChipTxt:   { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  typeChipActiveTxt: { color: "#fff", fontWeight: "600" },
  chip:          { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#f3f4f6", marginRight: 6 },
  chipActive:    { backgroundColor: BRAND },
  chipTxt:       { fontSize: 13, color: "#6b7280", maxWidth: 120 },
  chipActiveTxt: { color: "#fff", fontWeight: "600" },
  formBtns:      { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  cancelBtn:     { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb" },
  cancelTxt:     { fontSize: 15, fontWeight: "600", color: "#374151" },
  saveBtn:       { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: BRAND },
  saveTxt:       { fontSize: 15, fontWeight: "700", color: "#fff" },
});
