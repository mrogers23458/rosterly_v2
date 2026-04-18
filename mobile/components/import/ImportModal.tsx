import { useState } from "react";
import {
  ActivityIndicator, Alert, Image, Modal, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { getSupabase } from "@/lib/supabase";
import {
  bulkCreatePlayers, createRoster, createTeam,
  fetchTeams, fetchRosters,
  type CreatePlayerInput,
} from "@/lib/supabase-queries";

const BRAND      = "#2563eb";
const BRAND_DARK = "#1e3a5f";
const API_URL    = "https://rosterlylineups.com/api/mobile/extract";

// ── GameChanger CSV parser (client-side) ────────────────────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    const row: string[] = []; let cell = ""; let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { row.push(cell); cell = ""; }
      else { cell += ch; }
    }
    row.push(cell);
    if (row.some((c) => c.trim())) rows.push(row);
  }
  return rows;
}

function parseGcCsv(text: string): CreatePlayerInput[] {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const hdr = rows[0].map((h) => h.toLowerCase().trim());
  const idx = (names: string[]) => names.map((n) => hdr.indexOf(n)).find((i) => i >= 0) ?? -1;
  const iFirst = idx(["first name","firstname","first"]);
  const iLast  = idx(["last name","lastname","last"]);
  const iNum   = idx(["jersey","jersey number","number","#"]);
  const iPos   = idx(["position","positions","pos"]);
  const iBats  = idx(["bats","bat"]);
  const iThrow = idx(["throws","throw"]);
  return rows.slice(1).flatMap((r) => {
    const first = r[iFirst]?.trim() ?? "";
    const last  = r[iLast]?.trim() ?? "";
    if (!first && !last) return [];
    return [{
      roster_id: "", first_name: first, last_name: last,
      jersey_number: iNum  >= 0 ? r[iNum]?.trim() : undefined,
      primary_positions: iPos >= 0 && r[iPos]?.trim() ? [r[iPos].trim()] : [],
      bats:   iBats  >= 0 ? r[iBats]?.trim() : undefined,
      throws: iThrow >= 0 ? r[iThrow]?.trim() : undefined,
    }] as CreatePlayerInput[];
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Method = "ai" | "sheets" | "gc";
type Step   = "pick" | "input" | "preview" | "saving" | "done";

interface ExtractionResult {
  source_type: string;
  team:   { name?: string; year?: number; season?: string; division?: string; age_group?: string; team_type?: string; organization?: string };
  roster: { name?: string; season?: string; year?: number };
  players: { first_name: string; last_name: string; jersey_number?: string; primary_positions?: string[]; bats?: string; throws?: string }[];
  game_lineup: { name?: string; game_date?: string; inning_count?: number };
  lineup_entries: unknown[];
  warnings: string[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function ImportModal({ visible, onClose, onImported }: Props) {
  const [method, setMethod] = useState<Method | null>(null);
  const [step, setStep]     = useState<Step>("pick");
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Input state
  const [sheetUrl, setSheetUrl]   = useState("");
  const [imageUri, setImageUri]   = useState<string | null>(null);
  const [gcPlayers, setGcPlayers] = useState<CreatePlayerInput[]>([]);

  // Extraction result
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);

  // Import options
  const [createTeamOpt,   setCreateTeamOpt]   = useState(true);
  const [createRosterOpt, setCreateRosterOpt] = useState(true);
  const [importPlayersOpt, setImportPlayersOpt] = useState(true);

  function reset() {
    setMethod(null); setStep("pick"); setBusy(false); setError(null);
    setSheetUrl(""); setImageUri(null); setGcPlayers([]); setExtraction(null);
    setCreateTeamOpt(true); setCreateRosterOpt(true); setImportPlayersOpt(true);
  }

  async function getToken(): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token ?? null;
  }

  // ── AI: pick image ──────────────────────────────────────────────────────────
  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo library access to import images."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, base64: false });
    if (!res.canceled && res.assets[0]) { setImageUri(res.assets[0].uri); }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow camera access to take a photo."); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: false });
    if (!res.canceled && res.assets[0]) { setImageUri(res.assets[0].uri); }
  }

  // ── GC: pick CSV ────────────────────────────────────────────────────────────
  async function pickGcFile() {
    const res = await DocumentPicker.getDocumentAsync({ type: ["text/csv","text/plain","*/*"], copyToCacheDirectory: true });
    if (res.canceled) return;
    const file = res.assets?.[0];
    if (!file) return;
    try {
      const resp = await fetch(file.uri);
      const text = await resp.text();
      const players = parseGcCsv(text);
      if (players.length === 0) { setError("No players found in the CSV. Check the format."); return; }
      setGcPlayers(players);
      setStep("preview");
    } catch {
      setError("Failed to read the file.");
    }
  }

  // ── Extract via API ─────────────────────────────────────────────────────────
  async function runExtraction() {
    setError(null); setBusy(true);
    const token = await getToken();
    if (!token) { setError("Not authenticated."); setBusy(false); return; }

    try {
      let res: Response;
      if (method === "ai" && imageUri) {
        const fd = new FormData();
        const ext = imageUri.split(".").pop() ?? "jpg";
        fd.append("file", { uri: imageUri, name: `photo.${ext}`, type: `image/${ext}` } as unknown as Blob);
        res = await fetch(API_URL, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      } else if (method === "sheets") {
        res = await fetch(API_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ sheetUrl: sheetUrl.trim() }),
        });
      } else { setBusy(false); return; }

      const json = await res.json();
      if (json.error) { setError(json.error); setBusy(false); return; }

      const data = json.data as ExtractionResult;
      setExtraction(data);
      setCreateTeamOpt(!!data.team?.name);
      setCreateRosterOpt(data.players?.length > 0 || !!data.roster?.name);
      setImportPlayersOpt(data.players?.length > 0);
      setStep("preview");
    } catch (e) {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  // ── Save extracted data ─────────────────────────────────────────────────────
  async function handleSave() {
    setBusy(true); setStep("saving");
    const sb = getSupabase();
    if (!sb) { setBusy(false); return; }

    try {
      // GC flow
      if (method === "gc") {
        let rosterId: string | undefined;
        if (createRosterOpt) {
          const teams = await fetchTeams();
          const r = await createRoster({ name: "Imported Roster" });
          rosterId = r?.id;
        } else {
          const rosters = await fetchRosters();
          rosterId = rosters[0]?.id;
        }
        if (!rosterId) { Alert.alert("Error", "Please create a roster first."); setBusy(false); setStep("preview"); return; }
        await bulkCreatePlayers(gcPlayers.map((p) => ({ ...p, roster_id: rosterId! })));
        setStep("done"); setBusy(false); return;
      }

      // AI / Sheets flow
      if (!extraction) { setBusy(false); return; }

      let teamId: string | undefined;
      if (createTeamOpt && extraction.team?.name) {
        const t = await createTeam({
          name: extraction.team.name,
          year: extraction.team.year ?? new Date().getFullYear(),
          season: extraction.team.season ?? undefined,
          division: extraction.team.division ?? undefined,
          age_group: extraction.team.age_group ?? undefined,
          team_type: extraction.team.team_type ?? undefined,
          organization: extraction.team.organization ?? undefined,
        });
        teamId = t?.id;
      }

      let rosterId: string | undefined;
      if (createRosterOpt) {
        const r = await createRoster({
          name: extraction.roster?.name ?? `${extraction.team?.name ?? "Imported"} Roster`,
          team_id: teamId ?? null,
          season: extraction.roster?.season ?? extraction.team?.season ?? undefined,
          year: extraction.roster?.year ?? extraction.team?.year ?? undefined,
        });
        rosterId = r?.id;
      }

      if (importPlayersOpt && rosterId && extraction.players?.length > 0) {
        await bulkCreatePlayers(extraction.players.map((p) => ({
          roster_id: rosterId!,
          first_name: p.first_name, last_name: p.last_name,
          jersey_number: p.jersey_number ?? undefined,
          primary_positions: p.primary_positions ?? [],
          bats: p.bats ?? undefined, throws: p.throws ?? undefined,
        })));
      }

      setStep("done");
    } catch (e) {
      setError("Something went wrong saving the data.");
      setStep("preview");
    } finally {
      setBusy(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { reset(); onClose(); }}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => { if (step === "pick" || step === "done") { reset(); onClose(); } else { setStep("pick"); setMethod(null); } }}>
            <Text style={s.backBtn}>{step === "pick" || step === "done" ? "✕ Close" : "← Back"}</Text>
          </Pressable>
          <Text style={s.headerTitle}>Import</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* ── Pick method ── */}
        {step === "pick" && (
          <ScrollView contentContainerStyle={s.scroll}>
            <Text style={s.sectionTitle}>How would you like to import?</Text>
            {[
              { id: "ai",     emoji: "✨", title: "AI Import",        desc: "Take a photo or upload an image of a lineup sheet, roster, or spreadsheet" },
              { id: "sheets", emoji: "📊", title: "Google Sheets",    desc: "Paste a Google Sheets link to import your roster directly" },
              { id: "gc",     emoji: "📄", title: "GameChanger CSV",  desc: "Upload a GameChanger roster export CSV file" },
            ].map((m) => (
              <Pressable
                key={m.id}
                style={({ pressed }) => [s.methodCard, pressed && { opacity: 0.8 }]}
                onPress={() => { setMethod(m.id as Method); setStep("input"); setError(null); }}
              >
                <Text style={s.methodEmoji}>{m.emoji}</Text>
                <View style={s.methodInfo}>
                  <Text style={s.methodTitle}>{m.title}</Text>
                  <Text style={s.methodDesc}>{m.desc}</Text>
                </View>
                <Text style={s.methodChevron}>›</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* ── AI input ── */}
        {step === "input" && method === "ai" && (
          <ScrollView contentContainerStyle={s.scroll}>
            <Text style={s.sectionTitle}>AI Import</Text>
            <Text style={s.sectionSub}>Take a photo or upload an image of a roster, lineup sheet, or spreadsheet.</Text>
            {imageUri ? (
              <View style={s.imagePreviewWrap}>
                <Image source={{ uri: imageUri }} style={s.imagePreview} resizeMode="contain" />
                <Pressable style={s.removeImg} onPress={() => setImageUri(null)}>
                  <Text style={s.removeImgTxt}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.imgBtns}>
                <Pressable style={s.imgBtn} onPress={takePhoto}>
                  <Text style={s.imgBtnEmoji}>📷</Text>
                  <Text style={s.imgBtnTxt}>Take photo</Text>
                </Pressable>
                <Pressable style={s.imgBtn} onPress={pickImage}>
                  <Text style={s.imgBtnEmoji}>🖼️</Text>
                  <Text style={s.imgBtnTxt}>Upload image</Text>
                </Pressable>
              </View>
            )}
            {error && <Text style={s.error}>{error}</Text>}
            <Pressable
              style={[s.primaryBtn, (!imageUri || busy) && s.primaryBtnDisabled]}
              onPress={runExtraction}
              disabled={!imageUri || busy}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>✨ Extract with AI</Text>}
            </Pressable>
          </ScrollView>
        )}

        {/* ── Sheets input ── */}
        {step === "input" && method === "sheets" && (
          <ScrollView contentContainerStyle={s.scroll}>
            <Text style={s.sectionTitle}>Google Sheets Import</Text>
            <Text style={s.sectionSub}>Paste the sharing link to your Google Sheet. Make sure it's set to "Anyone with the link can view".</Text>
            <TextInput
              style={s.urlInput}
              value={sheetUrl}
              onChangeText={setSheetUrl}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {error && <Text style={s.error}>{error}</Text>}
            <Pressable
              style={[s.primaryBtn, (!sheetUrl.trim() || busy) && s.primaryBtnDisabled]}
              onPress={runExtraction}
              disabled={!sheetUrl.trim() || busy}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>📊 Import from Sheets</Text>}
            </Pressable>
          </ScrollView>
        )}

        {/* ── GC input ── */}
        {step === "input" && method === "gc" && (
          <ScrollView contentContainerStyle={s.scroll}>
            <Text style={s.sectionTitle}>GameChanger CSV</Text>
            <Text style={s.sectionSub}>Export your roster from GameChanger, then upload the CSV file.</Text>
            {error && <Text style={s.error}>{error}</Text>}
            <Pressable style={s.primaryBtn} onPress={pickGcFile}>
              <Text style={s.primaryBtnTxt}>📄 Choose CSV file</Text>
            </Pressable>
          </ScrollView>
        )}

        {/* ── Preview ── */}
        {step === "preview" && (
          <ScrollView contentContainerStyle={s.scroll}>
            <Text style={s.sectionTitle}>Review & confirm</Text>

            {/* GC preview */}
            {method === "gc" && (
              <>
                <View style={s.previewCard}>
                  <Text style={s.previewCardTitle}>📄 {gcPlayers.length} players found</Text>
                  {gcPlayers.slice(0, 5).map((p, i) => (
                    <Text key={i} style={s.previewRow}>
                      {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.first_name} {p.last_name}
                      {p.primary_positions?.length ? ` · ${p.primary_positions[0]}` : ""}
                    </Text>
                  ))}
                  {gcPlayers.length > 5 && <Text style={s.previewMore}>…and {gcPlayers.length - 5} more</Text>}
                </View>

                <View style={s.optionRow}>
                  <Text style={s.optionLabel}>Create new roster</Text>
                  <Pressable onPress={() => setCreateRosterOpt(!createRosterOpt)} style={[s.toggle, createRosterOpt && s.toggleOn]}>
                    <View style={[s.toggleKnob, createRosterOpt && s.toggleKnobOn]} />
                  </Pressable>
                </View>
              </>
            )}

            {/* AI/Sheets preview */}
            {extraction && (
              <>
                {extraction.team?.name && (
                  <View style={s.previewCard}>
                    <Text style={s.previewCardTitle}>⚾ Team: {extraction.team.name}</Text>
                    <Text style={s.previewRow}>{[extraction.team.year, extraction.team.season, extraction.team.division].filter(Boolean).join(" · ")}</Text>
                  </View>
                )}
                {(extraction.players?.length > 0 || extraction.roster?.name) && (
                  <View style={s.previewCard}>
                    <Text style={s.previewCardTitle}>📋 Roster: {extraction.roster?.name ?? "Auto-named"}</Text>
                    {extraction.players?.length > 0 && (
                      <>
                        {extraction.players.slice(0, 5).map((p, i) => (
                          <Text key={i} style={s.previewRow}>
                            {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.first_name} {p.last_name}
                            {p.primary_positions?.length ? ` · ${p.primary_positions[0]}` : ""}
                          </Text>
                        ))}
                        {extraction.players.length > 5 && <Text style={s.previewMore}>…and {extraction.players.length - 5} more</Text>}
                      </>
                    )}
                  </View>
                )}

                {extraction.warnings?.length > 0 && (
                  <View style={s.warningCard}>
                    <Text style={s.warningTitle}>⚠ Notes from AI</Text>
                    {extraction.warnings.map((w, i) => <Text key={i} style={s.warningTxt}>• {w}</Text>)}
                  </View>
                )}

                {extraction.team?.name && (
                  <View style={s.optionRow}>
                    <Text style={s.optionLabel}>Create team</Text>
                    <Pressable onPress={() => setCreateTeamOpt(!createTeamOpt)} style={[s.toggle, createTeamOpt && s.toggleOn]}>
                      <View style={[s.toggleKnob, createTeamOpt && s.toggleKnobOn]} />
                    </Pressable>
                  </View>
                )}
                {(extraction.players?.length > 0 || extraction.roster?.name) && (
                  <View style={s.optionRow}>
                    <Text style={s.optionLabel}>Create roster</Text>
                    <Pressable onPress={() => setCreateRosterOpt(!createRosterOpt)} style={[s.toggle, createRosterOpt && s.toggleOn]}>
                      <View style={[s.toggleKnob, createRosterOpt && s.toggleKnobOn]} />
                    </Pressable>
                  </View>
                )}
                {extraction.players?.length > 0 && (
                  <View style={s.optionRow}>
                    <Text style={s.optionLabel}>Import {extraction.players.length} players</Text>
                    <Pressable onPress={() => setImportPlayersOpt(!importPlayersOpt)} style={[s.toggle, importPlayersOpt && s.toggleOn]}>
                      <View style={[s.toggleKnob, importPlayersOpt && s.toggleKnobOn]} />
                    </Pressable>
                  </View>
                )}
              </>
            )}

            {error && <Text style={s.error}>{error}</Text>}
            <Pressable style={[s.primaryBtn, busy && s.primaryBtnDisabled]} onPress={handleSave} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>Save imported data</Text>}
            </Pressable>
          </ScrollView>
        )}

        {/* ── Saving ── */}
        {step === "saving" && (
          <View style={s.doneWrap}>
            <ActivityIndicator size="large" color={BRAND} />
            <Text style={s.savingTxt}>Saving…</Text>
          </View>
        )}

        {/* ── Done ── */}
        {step === "done" && (
          <View style={s.doneWrap}>
            <Text style={s.doneEmoji}>✅</Text>
            <Text style={s.doneTitle}>Import complete!</Text>
            <Text style={s.doneSub}>Your data has been saved successfully.</Text>
            <Pressable style={[s.primaryBtn, { marginTop: 24 }]} onPress={() => { reset(); onImported(); }}>
              <Text style={s.primaryBtnTxt}>Done</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#f9fafb" },
  header:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb", backgroundColor: "#fff" },
  backBtn:        { fontSize: 15, color: BRAND, fontWeight: "600" },
  headerTitle:    { fontSize: 17, fontWeight: "700", color: "#111" },
  scroll:         { padding: 20, paddingBottom: 48 },
  sectionTitle:   { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 6 },
  sectionSub:     { fontSize: 14, color: "#6b7280", lineHeight: 20, marginBottom: 20 },
  methodCard:     { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  methodEmoji:    { fontSize: 28, marginRight: 14 },
  methodInfo:     { flex: 1 },
  methodTitle:    { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 3 },
  methodDesc:     { fontSize: 13, color: "#6b7280", lineHeight: 18 },
  methodChevron:  { fontSize: 20, color: "#d1d5db", marginLeft: 8 },
  imgBtns:        { flexDirection: "row", gap: 12, marginBottom: 20 },
  imgBtn:         { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 20, alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb", gap: 8 },
  imgBtnEmoji:    { fontSize: 32 },
  imgBtnTxt:      { fontSize: 14, fontWeight: "600", color: "#374151" },
  imagePreviewWrap:{ marginBottom: 16 },
  imagePreview:   { width: "100%", height: 220, borderRadius: 12, backgroundColor: "#f3f4f6" },
  removeImg:      { marginTop: 8, alignSelf: "flex-end" },
  removeImgTxt:   { color: "#ef4444", fontSize: 14, fontWeight: "600" },
  urlInput:       { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", padding: 14, fontSize: 14, color: "#111", marginBottom: 16 },
  error:          { color: "#ef4444", fontSize: 14, marginBottom: 12, backgroundColor: "#fee2e2", padding: 12, borderRadius: 10 },
  primaryBtn:     { backgroundColor: BRAND, borderRadius: 14, padding: 16, alignItems: "center" },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnTxt:  { color: "#fff", fontSize: 16, fontWeight: "700" },
  previewCard:    { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  previewCardTitle:{ fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 8 },
  previewRow:     { fontSize: 14, color: "#374151", paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6" },
  previewMore:    { fontSize: 13, color: "#6b7280", marginTop: 6 },
  warningCard:    { backgroundColor: "#fffbeb", borderRadius: 12, padding: 14, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: "#f59e0b" },
  warningTitle:   { fontSize: 14, fontWeight: "700", color: "#92400e", marginBottom: 6 },
  warningTxt:     { fontSize: 13, color: "#78350f", lineHeight: 18 },
  optionRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8 },
  optionLabel:    { fontSize: 15, fontWeight: "600", color: "#111" },
  toggle:         { width: 48, height: 28, borderRadius: 14, backgroundColor: "#e5e7eb", justifyContent: "center", padding: 2 },
  toggleOn:       { backgroundColor: BRAND },
  toggleKnob:     { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 3 },
  toggleKnobOn:   { alignSelf: "flex-end" },
  doneWrap:       { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  doneEmoji:      { fontSize: 64, marginBottom: 16 },
  doneTitle:      { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 8 },
  doneSub:        { fontSize: 16, color: "#6b7280", textAlign: "center" },
  savingTxt:      { fontSize: 16, color: "#6b7280", marginTop: 16 },
});
