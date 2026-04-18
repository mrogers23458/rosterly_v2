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
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  archiveRoster, createPlayer, deletePlayer, deleteRoster,
  fetchPlayers, fetchRoster, updatePlayer, updateRoster,
  type CreatePlayerInput, type Player, type Roster,
} from "@/lib/supabase-queries";

const BRAND = "#2563eb";
const POSITIONS = ["P","C","1B","2B","3B","SS","LF","CF","RF","DH","UT"];

export default function RosterDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const [roster, setRoster]     = useState<Roster | null>(null);
  const [players, setPlayers]   = useState<Player[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  // Edit roster sheet
  const [editOpen, setEditOpen] = useState(false);
  const [savingRoster, setSavingRoster] = useState(false);
  const [rName, setRName]       = useState("");
  const [rSeason, setRSeason]   = useState("");
  const [rYear, setRYear]       = useState("");
  const [rNotes, setRNotes]     = useState("");

  // Player sheet
  const [playerSheetOpen, setPlayerSheetOpen] = useState(false);
  const [editingPlayer, setEditingPlayer]     = useState<Player | null>(null);
  const [savingPlayer, setSavingPlayer]       = useState(false);
  const [pFirst, setPFirst]     = useState("");
  const [pLast, setPLast]       = useState("");
  const [pJersey, setPJersey]   = useState("");
  const [pPrimPos, setPrimPos]  = useState<string[]>([]);
  const [pBats, setPBats]       = useState("");
  const [pThrows, setPThrows]   = useState("");
  const [pNotes, setPNotes]     = useState("");

  // Action
  const [selPlayer, setSelPlayer]   = useState<Player | null>(null);
  const [actionOpen, setActionOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [r, p] = await Promise.all([fetchRoster(id), fetchPlayers(id)]);
    setRoster(r); setPlayers(p);
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Roster edit ────────────────────────────────────────────────────────────
  function openEditRoster() {
    if (!roster) return;
    setRName(roster.name); setRSeason(roster.season ?? "");
    setRYear(roster.year ? String(roster.year) : ""); setRNotes(roster.notes ?? "");
    setEditOpen(true);
  }

  async function handleSaveRoster() {
    if (!roster || !rName.trim()) { Alert.alert("Required", "Roster name is required."); return; }
    setSavingRoster(true);
    await updateRoster(roster.id, {
      name: rName.trim(), season: rSeason || undefined,
      year: rYear ? parseInt(rYear, 10) : undefined, notes: rNotes || undefined,
    });
    setSavingRoster(false);
    setEditOpen(false); load();
  }

  // ── Player form ────────────────────────────────────────────────────────────
  function openNewPlayer() {
    setEditingPlayer(null);
    setPFirst(""); setPLast(""); setPJersey(""); setPrimPos([]);
    setPBats(""); setPThrows(""); setPNotes("");
    setPlayerSheetOpen(true);
  }

  function openEditPlayer(p: Player) {
    setEditingPlayer(p);
    setPFirst(p.first_name); setPLast(p.last_name); setPJersey(p.jersey_number ?? "");
    setPrimPos(p.primary_positions ?? []); setPBats(p.bats ?? ""); setPThrows(p.throws ?? "");
    setPNotes(p.notes ?? "");
    setPlayerSheetOpen(true);
  }

  function togglePos(pos: string) {
    setPrimPos((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos],
    );
  }

  async function handleSavePlayer() {
    if (!roster) return;
    if (!pFirst.trim() || !pLast.trim()) { Alert.alert("Required", "First and last name are required."); return; }
    setSavingPlayer(true);
    if (editingPlayer) {
      await updatePlayer(editingPlayer.id, {
        first_name: pFirst.trim(), last_name: pLast.trim(),
        jersey_number: pJersey || undefined, primary_positions: pPrimPos,
        bats: pBats || undefined, throws: pThrows || undefined, notes: pNotes || undefined,
      });
    } else {
      await createPlayer({
        roster_id: roster.id, first_name: pFirst.trim(), last_name: pLast.trim(),
        jersey_number: pJersey || undefined, primary_positions: pPrimPos,
        bats: pBats || undefined, throws: pThrows || undefined, notes: pNotes || undefined,
      });
    }
    setSavingPlayer(false);
    setPlayerSheetOpen(false); load();
  }

  async function handleDeletePlayer(p: Player) {
    Alert.alert("Remove player", `Remove ${p.first_name} ${p.last_name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { await deletePlayer(p.id); load(); } },
    ]);
  }

  async function handleDeleteRoster() {
    if (!roster) return;
    Alert.alert("Delete roster", `Delete "${roster.name}"? All players will be removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteRoster(roster.id); router.back(); } },
    ]);
  }

  const filtered = players.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
           (p.jersey_number ?? "").includes(q);
  });

  function renderPlayer({ item }: { item: Player }) {
    return (
      <Pressable
        style={({ pressed }) => [s.playerRow, pressed && { backgroundColor: "#f9fafb" }]}
        onLongPress={() => { setSelPlayer(item); setActionOpen(true); }}
        delayLongPress={350}
        onPress={() => openEditPlayer(item)}
      >
        <View style={s.jersey}>
          <Text style={s.jerseyNum}>{item.jersey_number ?? "–"}</Text>
        </View>
        <View style={s.playerInfo}>
          <Text style={s.playerName}>{item.first_name} {item.last_name}</Text>
          {item.primary_positions.length > 0 && (
            <Text style={s.playerPos}>{item.primary_positions.join(", ")}</Text>
          )}
        </View>
        {item.bats && <Text style={s.batThrow}>{item.bats}/{item.throws ?? "–"}</Text>}
        <Text style={s.chevron}>›</Text>
      </Pressable>
    );
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={BRAND} /></View>;
  if (!roster) return <View style={s.center}><Text style={s.err}>Roster not found.</Text></View>;

  return (
    <View style={s.flex}>
      {/* Header card */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.rosterName}>{roster.name}</Text>
            {roster.team?.name && <Text style={s.teamName}>{roster.team.name}</Text>}
            <Text style={s.meta}>{[roster.year, roster.season].filter(Boolean).join(" · ")}</Text>
          </View>
          <Pressable style={s.editBtn} onPress={openEditRoster}>
            <Text style={s.editBtnTxt}>Edit</Text>
          </Pressable>
        </View>
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statVal}>{players.length}</Text>
            <Text style={s.statLabel}>players</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statVal}>{players.filter((p) => p.is_active).length}</Text>
            <Text style={s.statLabel}>active</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <FormField
          label=""
          value={search}
          onChangeText={setSearch}
          placeholder="Search players…"
          style={s.searchInput}
        />
      </View>

      {/* Player list */}
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={renderPlayer}
        contentContainerStyle={[s.list, filtered.length === 0 && s.listEmpty]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        ListEmptyComponent={
          <EmptyState
            emoji="👤"
            title={search ? "No players match" : "No players yet"}
            subtitle={search ? "Try a different search." : "Tap + to add your first player."}
          />
        }
        ItemSeparatorComponent={() => <View style={s.sep} />}
      />

      {/* Danger zone */}
      <View style={s.danger}>
        <Pressable style={s.archiveBtn} onPress={() => { archiveRoster(roster.id); router.back(); }}>
          <Text style={s.archiveBtnTxt}>Archive roster</Text>
        </Pressable>
        <Pressable style={s.deleteBtn} onPress={handleDeleteRoster}>
          <Text style={s.deleteBtnTxt}>Delete roster</Text>
        </Pressable>
      </View>

      <FAB onPress={openNewPlayer} />

      {/* Edit roster sheet */}
      <BottomSheet visible={editOpen} onClose={() => setEditOpen(false)} title="Edit roster" heightFraction={0.65}>
        <ScrollView style={s.form} keyboardShouldPersistTaps="handled">
          <FormField label="Roster name *" value={rName} onChangeText={setRName} />
          <FormField label="Season" value={rSeason} onChangeText={setRSeason} />
          <FormField label="Year" value={rYear} onChangeText={setRYear} keyboardType="number-pad" maxLength={4} />
          <FormField label="Notes" value={rNotes} onChangeText={setRNotes} multiline numberOfLines={2} />
        </ScrollView>
        <View style={s.formBtns}>
          <Pressable style={s.cancelBtn} onPress={() => setEditOpen(false)}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </Pressable>
          <Pressable style={[s.saveBtn, savingRoster && { opacity: 0.6 }]} onPress={handleSaveRoster} disabled={savingRoster}>
            {savingRoster ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Save</Text>}
          </Pressable>
        </View>
      </BottomSheet>

      {/* Add/Edit player sheet */}
      <BottomSheet
        visible={playerSheetOpen}
        onClose={() => setPlayerSheetOpen(false)}
        title={editingPlayer ? "Edit player" : "Add player"}
        heightFraction={0.88}
      >
        <ScrollView style={s.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.row}>
            <View style={s.half}>
              <FormField label="First name *" value={pFirst} onChangeText={setPFirst} autoFocus />
            </View>
            <View style={s.half}>
              <FormField label="Last name *" value={pLast} onChangeText={setPLast} />
            </View>
          </View>
          <FormField label="Jersey #" value={pJersey} onChangeText={setPJersey} keyboardType="number-pad" maxLength={3} placeholder="#" />

          <Text style={s.posLabel}>Positions</Text>
          <View style={s.posGrid}>
            {POSITIONS.map((pos) => (
              <Pressable
                key={pos}
                style={[s.posChip, pPrimPos.includes(pos) && s.posChipActive]}
                onPress={() => togglePos(pos)}
              >
                <Text style={[s.posChipTxt, pPrimPos.includes(pos) && s.posChipActiveTxt]}>{pos}</Text>
              </Pressable>
            ))}
          </View>

          <View style={s.row}>
            <View style={s.half}>
              <Text style={s.miniLabel}>Bats</Text>
              <SegmentedControl options={[{label:"L",value:"L"},{label:"R",value:"R"},{label:"S",value:"S"}]} value={pBats} onChange={setPBats} />
            </View>
            <View style={s.half}>
              <Text style={s.miniLabel}>Throws</Text>
              <SegmentedControl options={[{label:"L",value:"L"},{label:"R",value:"R"}]} value={pThrows} onChange={setPThrows} />
            </View>
          </View>

          <FormField label="Notes" value={pNotes} onChangeText={setPNotes} multiline numberOfLines={2} />
          <View style={{ height: 16 }} />
        </ScrollView>
        <View style={s.formBtns}>
          <Pressable style={s.cancelBtn} onPress={() => setPlayerSheetOpen(false)}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </Pressable>
          <Pressable style={[s.saveBtn, savingPlayer && { opacity: 0.6 }]} onPress={handleSavePlayer} disabled={savingPlayer}>
            {savingPlayer ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>{editingPlayer ? "Save" : "Add player"}</Text>}
          </Pressable>
        </View>
      </BottomSheet>

      {/* Player action sheet */}
      <ActionSheet
        visible={actionOpen}
        onClose={() => setActionOpen(false)}
        title={selPlayer ? `${selPlayer.first_name} ${selPlayer.last_name}` : undefined}
        actions={[
          { label: "Edit player",   onPress: () => selPlayer && openEditPlayer(selPlayer) },
          { label: "Remove player", destructive: true, onPress: () => selPlayer && handleDeletePlayer(selPlayer) },
        ]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  flex:             { flex: 1, backgroundColor: "#f9fafb" },
  center:           { flex: 1, alignItems: "center", justifyContent: "center" },
  err:              { color: "#6b7280", fontSize: 16 },
  header:           { backgroundColor: "#fff", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb" },
  headerRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerLeft:       { flex: 1, marginRight: 8 },
  rosterName:       { fontSize: 20, fontWeight: "800", color: "#111" },
  teamName:         { fontSize: 13, color: BRAND, fontWeight: "500", marginTop: 2 },
  meta:             { fontSize: 13, color: "#6b7280", marginTop: 2 },
  editBtn:          { backgroundColor: "#eff6ff", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnTxt:       { color: BRAND, fontWeight: "600", fontSize: 14 },
  statsRow:         { flexDirection: "row", gap: 20, marginTop: 12 },
  stat:             { alignItems: "center" },
  statVal:          { fontSize: 22, fontWeight: "800", color: "#111" },
  statLabel:        { fontSize: 12, color: "#6b7280" },
  searchWrap:       { paddingHorizontal: 16, paddingTop: 10, backgroundColor: "#f9fafb" },
  searchInput:      { marginBottom: 0 },
  list:             { backgroundColor: "#fff", flexGrow: 1 },
  listEmpty:        { flex: 1 },
  sep:              { height: StyleSheet.hairlineWidth, backgroundColor: "#f3f4f6", marginLeft: 16 },
  playerRow:        { flexDirection: "row", alignItems: "center", padding: 12, paddingHorizontal: 16, backgroundColor: "#fff" },
  jersey:           { width: 36, height: 36, borderRadius: 18, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", marginRight: 12 },
  jerseyNum:        { fontSize: 14, fontWeight: "700", color: BRAND },
  playerInfo:       { flex: 1 },
  playerName:       { fontSize: 16, fontWeight: "600", color: "#111" },
  playerPos:        { fontSize: 13, color: "#6b7280", marginTop: 1 },
  batThrow:         { fontSize: 12, color: "#9ca3af", marginRight: 8 },
  chevron:          { fontSize: 18, color: "#d1d5db" },
  danger:           { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb", backgroundColor: "#fff" },
  archiveBtn:       { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb" },
  archiveBtnTxt:    { fontSize: 13, fontWeight: "600", color: "#374151" },
  deleteBtn:        { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", borderWidth: 1.5, borderColor: "#fecaca" },
  deleteBtnTxt:     { fontSize: 13, fontWeight: "600", color: "#ef4444" },
  form:             { paddingHorizontal: 20, paddingTop: 8 },
  formBtns:         { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  cancelBtn:        { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb" },
  cancelTxt:        { fontSize: 15, fontWeight: "600", color: "#374151" },
  saveBtn:          { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: BRAND },
  saveTxt:          { fontSize: 15, fontWeight: "700", color: "#fff" },
  row:              { flexDirection: "row", gap: 10 },
  half:             { flex: 1 },
  posLabel:         { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  posGrid:          { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  posChip:          { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#f3f4f6", minWidth: 44, alignItems: "center" },
  posChipActive:    { backgroundColor: BRAND },
  posChipTxt:       { fontSize: 14, fontWeight: "600", color: "#374151" },
  posChipActiveTxt: { color: "#fff" },
  miniLabel:        { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 4 },
});
