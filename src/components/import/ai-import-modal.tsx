"use client";

import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Image,
  LayoutList,
  Link2,
  Loader2,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import {
  extractFromFile,
  extractFromGoogleSheet,
  importExtractedData,
  type ExtractionResult,
  type ImportOptions,
} from "@/app/actions/ai-import";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AGE_GROUPS, SEASONS } from "@/lib/constants/teams";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type InputMode = "file" | "sheets";
type Step = "upload" | "extracting" | "review" | "fill" | "importing" | "done";

type ImportResult = {
  teamId?: string;
  rosterId?: string;
  lineupId?: string;
  playerCount?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confidenceBadge(level: "high" | "medium" | "low") {
  const map = {
    high:   "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    low:    "bg-rose-100  text-rose-800  dark:bg-rose-900/40  dark:text-rose-300",
  };
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", map[level])}>
      {level} confidence
    </span>
  );
}

function sourceTypeBadge(type: ExtractionResult["source_type"]) {
  const labels: Record<ExtractionResult["source_type"], string> = {
    team_metadata:   "Team metadata",
    roster:          "Roster",
    game_lineup:     "Game lineup",
    mixed_document:  "Mixed document",
    unsupported:     "Unsupported",
  };
  return (
    <Badge variant={type === "unsupported" ? "destructive" : "default"}>
      {labels[type]}
    </Badge>
  );
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext))
    return <Image className="h-5 w-5 text-primary" />;
  if (["csv", "tsv", "xlsx", "xls"].includes(ext))
    return <FileSpreadsheet className="h-5 w-5 text-primary" />;
  return <FileText className="h-5 w-5 text-primary" />;
}

// ─── Main modal ───────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** If provided, pre-fill the existing team selection for roster/lineup import */
  preselectedTeamId?: string;
  /** Pre-select the upload tab on open ("file" or "sheets") */
  defaultInputMode?: InputMode;
};

export function AiImportModal({ open, onOpenChange, preselectedTeamId, defaultInputMode }: Props) {
  const [step,       setStep]       = useState<Step>("upload");
  const [inputMode,  setInputMode]  = useState<InputMode>(defaultInputMode ?? "file");
  const [file,       setFile]       = useState<File | null>(null);
  const [sheetUrl,   setSheetUrl]   = useState("");
  const [dragging,   setDragging]   = useState(false);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [result,     setResult]     = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import options
  const [createTeam,    setCreateTeam]    = useState(true);
  const [createRoster,  setCreateRoster]  = useState(true);
  const [importPlayers, setImportPlayers] = useState(true);
  const [createLineup,  setCreateLineup]  = useState(true);

  // "fill" step — user-provided overrides for missing required fields
  const [fillTeamName,     setFillTeamName]     = useState("");
  const [fillTeamYear,     setFillTeamYear]      = useState(new Date().getFullYear().toString());
  const [fillTeamSeason,   setFillTeamSeason]    = useState("");
  const [fillTeamAgeGroup, setFillTeamAgeGroup]  = useState("");

  const [isPending, startTransition] = useTransition();

  function reset() {
    setStep("upload");
    setInputMode("file");
    setFile(null);
    setSheetUrl("");
    setExtraction(null);
    setError(null);
    setResult(null);
    setCreateTeam(true);
    setCreateRoster(true);
    setImportPlayers(true);
    setCreateLineup(true);
    setFillTeamName("");
    setFillTeamYear(new Date().getFullYear().toString());
    setFillTeamSeason("");
    setFillTeamAgeGroup("");
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  // ── File selection ──────────────────────────────────────────────────────────

  function handleFileSelect(selected: File) {
    setFile(selected);
    setError(null);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []);

  // ── Extract ─────────────────────────────────────────────────────────────────

  function handleExtract() {
    if (inputMode === "file" && !file) return;
    if (inputMode === "sheets" && !sheetUrl.trim()) return;
    setError(null);
    setStep("extracting");

    startTransition(async () => {
      let res;
      if (inputMode === "sheets") {
        res = await extractFromGoogleSheet(sheetUrl.trim());
      } else {
        const fd = new FormData();
        fd.append("file", file!);
        res = await extractFromFile(fd);
      }
      if (res.error || !res.data) {
        setError(res.error ?? "Extraction failed.");
        setStep("upload");
        return;
      }

      const data = res.data;
      setExtraction(data);

      // Auto-configure import options based on source type
      const hasTeam    = !!data.team.name;
      const hasRoster  = data.players.length > 0;
      const hasLineup  = !!data.game_lineup.inning_count && data.lineup_entries.length > 0;

      setCreateTeam(hasTeam && !preselectedTeamId);
      setCreateRoster(hasRoster || data.source_type === "roster");
      setImportPlayers(hasRoster);
      setCreateLineup(hasLineup);

      setStep("review");
    });
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  /**
   * Returns true if the selected options will resolve a valid teamId
   * without asking the user for extra info.
   */
  function teamWillResolve(ex: ExtractionResult): boolean {
    if (preselectedTeamId) return true;
    if (createTeam && !!ex.team.name) return true;
    return false;
  }

  /** True when at least one option needs a team but none is resolvable. */
  function needsTeamFill(ex: ExtractionResult): boolean {
    const wantsTeamRecord = createRoster || importPlayers || createLineup;
    return wantsTeamRecord && !teamWillResolve(ex);
  }

  // ── Import — validates first, goes to "fill" if info is missing ───────────

  function handleImport() {
    if (!extraction) return;
    setError(null);

    if (needsTeamFill(extraction)) {
      // Pre-populate fill fields from whatever AI did find
      setFillTeamName(extraction.team.name ?? "");
      setFillTeamYear(extraction.team.year ?? new Date().getFullYear().toString());
      setFillTeamSeason(extraction.team.season ?? "");
      setFillTeamAgeGroup(extraction.team.age_group ?? "");
      setStep("fill");
      return;
    }

    runImport(extraction);
  }

  function handleConfirmFill() {
    if (!extraction || !fillTeamName.trim()) return;
    // Merge user-provided info into the extraction so the import action
    // uses it instead of the original (potentially null) values.
    const patched: ExtractionResult = {
      ...extraction,
      team: {
        ...extraction.team,
        name:      fillTeamName.trim()   || extraction.team.name,
        year:      fillTeamYear.trim()   || extraction.team.year,
        season:    fillTeamSeason        || extraction.team.season,
        age_group: fillTeamAgeGroup      || extraction.team.age_group,
      },
    };
    // Make sure "create team" is enabled so the patched team actually gets created
    setCreateTeam(true);
    setExtraction(patched);
    runImport(patched, true);
  }

  function runImport(ex: ExtractionResult, forceCreateTeam?: boolean) {
    setError(null);
    setStep("importing");

    const options: ImportOptions = {
      createTeam:    forceCreateTeam ?? createTeam,
      createRoster,
      importPlayers,
      createLineup,
      existingTeamId: !createTeam && !forceCreateTeam ? preselectedTeamId : undefined,
    };

    startTransition(async () => {
      const res = await importExtractedData(ex, options);
      if (res.error) {
        setError(res.error);
        setStep("review");
        return;
      }
      setResult(res);
      setStep("done");
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isWide = step === "review" || step === "fill";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "max-h-[92vh] overflow-y-auto transition-all",
          isWide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Import
          </DialogTitle>
          <DialogDescription>
            Upload a CSV, spreadsheet, or photo of a lineup card. AI will extract teams, rosters, players, and lineups automatically.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {/* ── Upload ──────────────────────────────────────────────────────── */}
          {step === "upload" && (
            <div className="flex flex-col gap-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Mode tabs */}
              <div className="flex rounded-lg border border-border bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => { setInputMode("file"); setError(null); }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    inputMode === "file"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload file
                </button>
                <button
                  type="button"
                  onClick={() => { setInputMode("sheets"); setError(null); }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    inputMode === "sheets"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Google Sheets
                </button>
              </div>

              {/* File upload mode */}
              {inputMode === "file" && (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
                      dragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/30",
                    )}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground/50" />
                    <div>
                      <p className="font-medium">Drop a file or click to browse</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        CSV, TSV, TXT, PNG, JPG, WEBP — up to 10 MB
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.tsv,.txt,.jpg,.jpeg,.png,.webp,.gif"
                      className="hidden"
                      onChange={handleInputChange}
                    />
                  </div>

                  {file && (
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                      {fileIcon(file.name)}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-muted-foreground"
                      >
                        ✕
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Google Sheets mode */}
              {inputMode === "sheets" && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sheets-url" className="text-sm font-medium">
                      Google Sheets URL
                    </label>
                    <input
                      id="sheets-url"
                      type="url"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
                    <strong>The sheet must be publicly shared.</strong> In Google Sheets, go to{" "}
                    <strong>File → Share → Share with others</strong>, then set access to{" "}
                    <strong>Anyone with the link → Viewer</strong>.
                  </div>
                </div>
              )}

              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={
                  isPending ||
                  (inputMode === "file" && !file) ||
                  (inputMode === "sheets" && !sheetUrl.trim())
                }
                onClick={handleExtract}
              >
                <Sparkles className="h-4 w-4" />
                {inputMode === "sheets" ? "Extract from Google Sheets" : "Extract with AI"}
              </Button>
            </div>
          )}

          {/* ── Extracting ──────────────────────────────────────────────────── */}
          {step === "extracting" && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Extracting data…</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  AI is reading your file. This usually takes 5–15 seconds.
                </p>
              </div>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* ── Review ──────────────────────────────────────────────────────── */}
          {step === "review" && extraction && (
            <div className="flex flex-col gap-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Header badges */}
              <div className="flex flex-wrap items-center gap-2">
                {sourceTypeBadge(extraction.source_type)}
                {confidenceBadge(extraction.extraction_confidence)}
                {extraction.source_artifact_name && (
                  <span className="text-xs text-muted-foreground">
                    Source: <span className="font-medium">{extraction.source_artifact_name}</span>
                  </span>
                )}
              </div>

              {extraction.source_type === "unsupported" ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                  The AI could not identify any structured data in this file. Try a different file format or a clearer image.
                </div>
              ) : (
                <>
                  {/* Extraction summary */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <SummaryCard
                      icon={<Building2 className="h-4 w-4" />}
                      label="Team"
                      value={extraction.team.name ?? "—"}
                      present={!!extraction.team.name}
                    />
                    <SummaryCard
                      icon={<Users className="h-4 w-4" />}
                      label="Players"
                      value={extraction.players.length > 0 ? `${extraction.players.length} found` : "—"}
                      present={extraction.players.length > 0}
                    />
                    <SummaryCard
                      icon={<FileSpreadsheet className="h-4 w-4" />}
                      label="Roster"
                      value={extraction.roster.name ?? (extraction.players.length > 0 ? "Auto-named" : "—")}
                      present={extraction.players.length > 0 || !!extraction.roster.name}
                    />
                    <SummaryCard
                      icon={<LayoutList className="h-4 w-4" />}
                      label="Lineup"
                      value={
                        extraction.lineup_entries.length > 0
                          ? `${extraction.lineup_entries.length} entries, ${extraction.game_lineup.inning_count} inn.`
                          : "—"
                      }
                      present={extraction.lineup_entries.length > 0}
                    />
                  </div>

                  {/* Warnings */}
                  {extraction.warnings.length > 0 && (
                    <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-900/10">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {extraction.warnings.length} warning{extraction.warnings.length !== 1 ? "s" : ""}
                      </p>
                      <ul className="flex flex-col gap-1">
                        {extraction.warnings.map((w, i) => (
                          <li key={i} className="text-xs text-amber-700 dark:text-amber-300">
                            • {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Import options */}
                  <div>
                    <p className="mb-2 text-sm font-semibold">What to import</p>
                    <div className="flex flex-col gap-2">
                      <ImportOption
                        checked={createTeam}
                        onChange={setCreateTeam}
                        disabled={!extraction.team.name || !!preselectedTeamId}
                        label="Create team"
                        detail={extraction.team.name
                          ? `"${extraction.team.name}"${extraction.team.year ? ` (${extraction.team.year})` : ""}`
                          : "No team data found"}
                      />
                      <ImportOption
                        checked={createRoster}
                        onChange={setCreateRoster}
                        disabled={extraction.players.length === 0 && !extraction.roster.name}
                        label="Create roster"
                        detail={
                          extraction.roster.name
                            ? `"${extraction.roster.name}"`
                            : extraction.players.length > 0
                            ? "Auto-named from file"
                            : "No roster data found"
                        }
                      />
                      <ImportOption
                        checked={importPlayers}
                        onChange={setImportPlayers}
                        disabled={extraction.players.length === 0}
                        label={`Import ${extraction.players.length} player${extraction.players.length !== 1 ? "s" : ""}`}
                        detail={
                          extraction.players.length > 0
                            ? extraction.players.slice(0, 3).map((p) =>
                                p.first_name && p.last_name
                                  ? `${p.first_name} ${p.last_name}`
                                  : p.full_name_original ?? "Unknown",
                              ).join(", ") + (extraction.players.length > 3 ? "…" : "")
                            : "No player data found"
                        }
                      />
                      <ImportOption
                        checked={createLineup}
                        onChange={setCreateLineup}
                        disabled={!extraction.game_lineup.inning_count || extraction.lineup_entries.length === 0}
                        label="Create game lineup"
                        detail={
                          extraction.lineup_entries.length > 0
                            ? `${extraction.game_lineup.name ?? "Auto-named"} · ${extraction.lineup_entries.length} players · ${extraction.game_lineup.inning_count} innings`
                            : "No lineup data found"
                        }
                      />
                    </div>
                  </div>

                  {/* Player preview */}
                  {extraction.players.length > 0 && (
                    <details className="group rounded-lg border border-border">
                      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium">
                        <span>Preview extracted players ({extraction.players.length})</span>
                        <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
                        <span className="hidden text-xs text-muted-foreground group-open:inline">Hide</span>
                      </summary>
                      <div className="overflow-x-auto border-t border-border">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Jersey</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Positions</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Conf.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {extraction.players.map((p, i) => (
                              <tr key={i} className="bg-card">
                                <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                                <td className="px-3 py-2 font-medium">
                                  {p.first_name && p.last_name
                                    ? `${p.first_name} ${p.last_name}`
                                    : p.full_name_original ?? "Unknown"}
                                </td>
                                <td className="px-3 py-2 font-mono text-muted-foreground">
                                  {p.jersey_number ?? "—"}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {[...p.primary_positions, ...p.secondary_positions].join(", ") || "—"}
                                </td>
                                <td className="px-3 py-2">
                                  {confidenceBadge(p.confidence)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}

                  {/* Lineup preview */}
                  {extraction.lineup_entries.length > 0 && (
                    <details className="group rounded-lg border border-border">
                      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium">
                        <span>
                          Preview lineup entries ({extraction.lineup_entries.length})
                          {extraction.game_lineup.game_date && (
                            <span className="ml-2 font-normal text-muted-foreground">
                              <CalendarDays className="mb-0.5 mr-0.5 inline h-3 w-3" />
                              {extraction.game_lineup.game_date}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
                        <span className="hidden text-xs text-muted-foreground group-open:inline">Hide</span>
                      </summary>
                      <div className="overflow-x-auto border-t border-border">
                        <table className="w-full text-xs" style={{ minWidth: `${300 + (extraction.game_lineup.inning_count ?? 0) * 60}px` }}>
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Order</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Player</th>
                              {Array.from({ length: extraction.game_lineup.inning_count ?? 0 }, (_, i) => (
                                <th key={i} className="px-2 py-2 text-center font-medium text-muted-foreground">
                                  Inn.{i + 1}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {extraction.lineup_entries.map((e, i) => (
                              <tr key={i} className="bg-card">
                                <td className="px-3 py-2 text-muted-foreground">{e.batting_order ?? i + 1}</td>
                                <td className="px-3 py-2 font-medium">{e.player_name ?? "Unknown"}</td>
                                {Array.from({ length: extraction.game_lineup.inning_count ?? 0 }, (_, ii) => (
                                  <td key={ii} className="px-2 py-2 text-center text-muted-foreground">
                                    {e.innings[ii] ?? "—"}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="flex-1"
                      onClick={() => { setStep("upload"); setExtraction(null); setError(null); }}
                    >
                      Try another source
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      className="flex-1"
                      disabled={
                        isPending ||
                        (!createTeam && !createRoster && !importPlayers && !createLineup)
                      }
                      onClick={handleImport}
                    >
                      Import selected data
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Fill required info ──────────────────────────────────────────── */}
          {step === "fill" && (
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-900/30 dark:bg-amber-900/10">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    A few details are needed
                  </p>
                  <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                    The AI couldn&apos;t identify enough team information from your file. Fill in the fields below to continue — everything else the AI found will be imported normally.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Team information
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="fill-team-name">
                      Team name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fill-team-name"
                      value={fillTeamName}
                      onChange={(e) => setFillTeamName(e.target.value)}
                      placeholder="e.g. Spokane Nationals"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="fill-team-year">Year</Label>
                      <Input
                        id="fill-team-year"
                        value={fillTeamYear}
                        onChange={(e) => setFillTeamYear(e.target.value)}
                        maxLength={4}
                        placeholder="2026"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="fill-team-season">Season</Label>
                      <Select
                        id="fill-team-season"
                        value={fillTeamSeason}
                        onChange={(e) => setFillTeamSeason(e.target.value)}
                      >
                        <option value="">—</option>
                        {SEASONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="fill-age-group">
                      Age group <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      id="fill-age-group"
                      value={fillTeamAgeGroup}
                      onChange={(e) => setFillTeamAgeGroup(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {AGE_GROUPS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => setStep("review")}
                >
                  Back to review
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="flex-1"
                  disabled={!fillTeamName.trim() || isPending}
                  onClick={handleConfirmFill}
                >
                  Continue import →
                </Button>
              </div>
            </div>
          )}

          {/* ── Importing ───────────────────────────────────────────────────── */}
          {step === "importing" && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-semibold">Saving to your account…</p>
                <p className="mt-1 text-sm text-muted-foreground">Creating records in the database.</p>
              </div>
            </div>
          )}

          {/* ── Done ────────────────────────────────────────────────────────── */}
          {step === "done" && result && (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-semibold">Import complete!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Here&apos;s what was created:
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 text-sm">
                {result.teamId && (
                  <DoneRow icon={<Building2 className="h-4 w-4" />} label="Team created">
                    <Link href={`/teams/${result.teamId}`} className="text-primary underline underline-offset-2" onClick={() => handleClose(false)}>
                      View team →
                    </Link>
                  </DoneRow>
                )}
                {result.rosterId && (
                  <DoneRow icon={<FileSpreadsheet className="h-4 w-4" />} label="Roster created">
                    {result.teamId && (
                      <Link href={`/rosters/${result.teamId}/${result.rosterId}`} className="text-primary underline underline-offset-2" onClick={() => handleClose(false)}>
                        View roster →
                      </Link>
                    )}
                  </DoneRow>
                )}
                {(result.playerCount ?? 0) > 0 && (
                  <DoneRow icon={<Users className="h-4 w-4" />} label={`${result.playerCount} player${(result.playerCount ?? 0) !== 1 ? "s" : ""} imported`} />
                )}
                {result.lineupId && (
                  <DoneRow icon={<LayoutList className="h-4 w-4" />} label="Game lineup created">
                    <Link href={`/lineups/${result.lineupId}`} className="text-primary underline underline-offset-2" onClick={() => handleClose(false)}>
                      View lineup →
                    </Link>
                  </DoneRow>
                )}
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" size="lg" className="flex-1" onClick={reset}>
                  Import another file
                </Button>
                <Button type="button" size="lg" className="flex-1" onClick={() => handleClose(false)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function SummaryCard({
  icon, label, value, present,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  present: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border p-3",
        present ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-50",
      )}
    >
      <div className={cn("flex items-center gap-1.5 text-xs font-medium", present ? "text-primary" : "text-muted-foreground")}>
        {icon}
        {label}
      </div>
      <p className="truncate text-xs text-muted-foreground">{value}</p>
    </div>
  );
}

function ImportOption({
  checked, onChange, disabled, label, detail,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
  label: string;
  detail: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
        disabled
          ? "cursor-not-allowed border-border/50 bg-muted/20 opacity-40"
          : checked
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card hover:border-primary/20",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </label>
  );
}

function DoneRow({
  icon, label, children,
}: {
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      {children}
    </div>
  );
}
