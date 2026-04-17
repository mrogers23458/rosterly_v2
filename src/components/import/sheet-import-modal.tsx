"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Link2,
  Loader2,
  Pencil,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useTransition, useState } from "react";
import { fetchSheetCsv, importSheetData, type SheetImportPayload } from "@/app/actions/sheet-import";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  AGE_GROUPS, BATS_OPTIONS, DIVISIONS, POSITIONS, SEASONS, TEAM_TYPES, THROWS_OPTIONS,
} from "@/lib/constants/teams";
import {
  type ColumnMap,
  type FieldType,
  type ParsedSheet,
  FIELD_LABELS,
  buildColumnMap,
  extractPlayersFromRows,
  extractSheetMetadata,
  isGameChangerFormat,
  parseCSVText,
  parseSheet,
} from "@/lib/parsers/sheet-parser";
import { parseGameChangerCSV } from "@/components/import/gc-parse";
import type { ImportPlayerInput } from "@/app/actions/import";
import { cn } from "@/lib/utils";

// ─── Step type ────────────────────────────────────────────────────────────────

type Step = "url" | "fetching" | "mapping" | "review" | "importing" | "done";

// ─── Team draft ───────────────────────────────────────────────────────────────

type TeamDraft = {
  name: string;
  year: string;
  season: string;
  division: string;
  age_group: string;
  team_type: string;
  organization: string;
  is_active: boolean;
};

type DoneResult = { teamId?: string; rosterId?: string; playerCount: number };

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "url",      label: "Sheet URL" },
  { key: "mapping",  label: "Map columns" },
  { key: "review",   label: "Review" },
  { key: "done",     label: "Done" },
];

function StepIndicator({ step }: { step: Step }) {
  const display = STEP_LABELS.filter((s) => !["fetching", "importing"].includes(s.key));
  const activeLabel =
    step === "fetching" ? "mapping"
    : step === "importing" ? "done"
    : step;
  const currentIdx = display.findIndex((s) => s.key === activeLabel);

  return (
    <div className="flex items-center gap-1 text-xs">
      {display.map((s, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        return (
          <span key={s.key} className="flex items-center gap-1">
            <span className={
              done   ? "font-medium text-green-600" :
              active ? "font-semibold text-primary" :
              "text-muted-foreground"
            }>
              {done ? "✓" : `${i + 1}.`} {s.label}
            </span>
            {i < display.length - 1 && (
              <span className="text-muted-foreground/40">›</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ─── Field type dropdown ──────────────────────────────────────────────────────

const FIELD_OPTIONS: FieldType[] = [
  "firstName", "lastName", "fullName", "jerseyNumber",
  "primaryPosition", "secondaryPosition", "bats", "throws", "active", "skip",
];

function FieldTypeSelect({
  value,
  onChange,
}: {
  value: FieldType;
  onChange: (v: FieldType) => void;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as FieldType)}
      className="h-8 text-xs"
    >
      {FIELD_OPTIONS.map((f) => (
        <option key={f} value={f}>{FIELD_LABELS[f]}</option>
      ))}
    </Select>
  );
}

// ─── Player row (review step) ─────────────────────────────────────────────────

function PlayerReviewRow({
  player,
  index,
  editing,
  onEdit,
  onSave,
  onChange,
}: {
  player:   ImportPlayerInput;
  index:    number;
  editing:  boolean;
  onEdit:   () => void;
  onSave:   () => void;
  onChange: (p: ImportPlayerInput) => void;
}) {
  function set<K extends keyof ImportPlayerInput>(k: K, v: ImportPlayerInput[K]) {
    onChange({ ...player, [k]: v });
  }

  if (!editing) {
    return (
      <tr className="border-b border-border last:border-0 transition-colors hover:bg-muted/20">
        <td className="px-3 py-2 text-xs text-muted-foreground">{player.jersey_number || "—"}</td>
        <td className="px-3 py-2 text-sm font-medium">
          {player.first_name} {player.last_name}
        </td>
        <td className="hidden px-3 py-2 text-xs text-muted-foreground sm:table-cell">
          {player.primary_positions.length
            ? <><span className="text-foreground">{player.primary_positions.join(", ")}</span>
                {player.secondary_positions.length > 0 && (
                  <span> · {player.secondary_positions.join(", ")}</span>
                )}</>
            : "—"}
        </td>
        <td className="px-3 py-2">
          <Badge variant={player.is_active ? "success" : "muted"}>
            {player.is_active ? "Active" : "Inactive"}
          </Badge>
        </td>
        <td className="px-3 py-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border bg-primary/5">
      <td colSpan={5} className="px-3 py-4">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">First *</Label>
              <Input className="h-8 text-xs" value={player.first_name}
                onChange={(e) => set("first_name", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Last *</Label>
              <Input className="h-8 text-xs" value={player.last_name}
                onChange={(e) => set("last_name", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Jersey #</Label>
              <Input className="h-8 text-xs" value={player.jersey_number}
                onChange={(e) => set("jersey_number", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Bats / Throws</Label>
              <div className="flex gap-1">
                <Select className="h-8 flex-1 text-xs" value={player.bats}
                  onChange={(e) => set("bats", e.target.value)}>
                  <option value="">—</option>
                  {BATS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
                <Select className="h-8 flex-1 text-xs" value={player.throws}
                  onChange={(e) => set("throws", e.target.value)}>
                  <option value="">—</option>
                  {THROWS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Primary positions</Label>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {POSITIONS.map((pos) => (
                <label key={pos} className="flex cursor-pointer items-center gap-1 text-xs">
                  <Checkbox
                    checked={player.primary_positions.includes(pos)}
                    onCheckedChange={(c) => set(
                      "primary_positions",
                      c
                        ? [...player.primary_positions, pos]
                        : player.primary_positions.filter((p) => p !== pos),
                    )}
                  />
                  {pos}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs">
              <Checkbox
                checked={player.is_active}
                onCheckedChange={(c) => set("is_active", c === true)}
              />
              Active on roster
            </label>
            <Button size="sm" onClick={onSave}>Save</Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** If provided, skip team creation and attach to this team */
  preselectedTeamId?: string;
};

export function SheetImportModal({ open, onOpenChange, preselectedTeamId }: Props) {
  const [step,        setStep]        = useState<Step>("url");
  const [sheetUrl,    setSheetUrl]    = useState("");
  const [error,       setError]       = useState<string | null>(null);
  const [parsed,      setParsed]      = useState<ParsedSheet | null>(null);
  const [columnMap,   setColumnMap]   = useState<ColumnMap>([]);
  const [players,     setPlayers]     = useState<ImportPlayerInput[]>([]);
  const [editingIdx,  setEditingIdx]  = useState<number | null>(null);
  const [doneResult,  setDoneResult]  = useState<DoneResult | null>(null);
  const [isPending,   startTransition] = useTransition();

  // Team info form
  const [teamName,    setTeamName]    = useState("");
  const [teamYear,    setTeamYear]    = useState(new Date().getFullYear().toString());
  const [teamSeason,  setTeamSeason]  = useState("");
  const [teamDiv,     setTeamDiv]     = useState("");
  const [teamAge,     setTeamAge]     = useState("");
  const [teamType,    setTeamType]    = useState<string>(TEAM_TYPES[0]);
  const [teamOrg,     setTeamOrg]     = useState("");
  const [rosterName,  setRosterName]  = useState("");
  const [createTeam,  setCreateTeam]  = useState(!preselectedTeamId);

  function reset() {
    setStep("url");
    setSheetUrl("");
    setError(null);
    setParsed(null);
    setColumnMap([]);
    setPlayers([]);
    setEditingIdx(null);
    setDoneResult(null);
    setCreateTeam(!preselectedTeamId);
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  // ── Fetch sheet ─────────────────────────────────────────────────────────────

  function handleFetch() {
    const url = sheetUrl.trim();
    if (!url) return;
    setError(null);
    setStep("fetching");

    startTransition(async () => {
      const res = await fetchSheetCsv(url);
      if (res.error || !res.csv) {
        setError(res.error ?? "Failed to fetch sheet.");
        setStep("url");
        return;
      }

      const sheet = parseSheet(res.csv);
      setParsed(sheet);
      setColumnMap(sheet.columnMap);

      // Pre-fill team form from metadata
      if (sheet.metadata.teamName) setTeamName(sheet.metadata.teamName);
      if (sheet.metadata.year)     setTeamYear(sheet.metadata.year);
      if (sheet.metadata.season)   setTeamSeason(sheet.metadata.season);
      if (sheet.metadata.division) setTeamDiv(sheet.metadata.division);
      if (sheet.metadata.org)      setTeamOrg(sheet.metadata.org);

      const now = new Date();
      setRosterName(
        `Sheet Roster ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`,
      );

      setStep("mapping");
    });
  }

  // ── Apply column map → generate player preview ──────────────────────────────

  function applyMapping() {
    if (!parsed) return;
    const dataRows = parsed.rows.slice(parsed.headerRowIndex + 1);
    const extracted = extractPlayersFromRows(dataRows, columnMap);
    setPlayers(extracted);
    setStep("review");
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  function handleImport() {
    setError(null);
    setStep("importing");

    const payload: SheetImportPayload = {
      team: createTeam && !preselectedTeamId
        ? {
            name:         teamName || "Unnamed Team",
            year:         teamYear,
            season:       teamSeason,
            division:     teamDiv,
            age_group:    teamAge,
            team_type:    teamType,
            organization: teamOrg,
            is_active:    true,
          }
        : undefined,
      roster: {
        name:      rosterName || "Imported Roster",
        season:    teamSeason,
        year:      teamYear,
        notes:     `Imported from Google Sheets on ${new Date().toLocaleDateString()}.`,
        is_active: true,
      },
      players,
      existingTeamId: preselectedTeamId ?? undefined,
    };

    startTransition(async () => {
      const res = await importSheetData(payload);
      if (res.error) {
        setError(res.error);
        setStep("review");
        return;
      }
      setDoneResult({ teamId: res.teamId, rosterId: res.rosterId, playerCount: res.playerCount });
      setStep("done");
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isWide = step === "mapping" || step === "review";

  // Columns that have values to show as preview
  const previewRows = parsed
    ? parsed.rows.slice(parsed.headerRowIndex + 1, parsed.headerRowIndex + 4)
    : [];
  const hasMapped = columnMap.some((c) => c.fieldType !== "skip");

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
            <Link2 className="h-4 w-4 text-primary" />
            Import from Google Sheets
          </DialogTitle>
          <DialogDescription>
            Paste a public Google Sheet URL and we&apos;ll parse your roster or player list automatically — no AI required.
          </DialogDescription>
          {step !== "url" && step !== "fetching" && step !== "done" && (
            <div className="mt-1">
              <StepIndicator step={step} />
            </div>
          )}
        </DialogHeader>

        <DialogBody>
          {/* ── URL step ─────────────────────────────────────────────────── */}
          {step === "url" && (
            <div className="flex flex-col gap-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sheet-url">Google Sheets URL</Label>
                <Input
                  id="sheet-url"
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
                <strong>The sheet must be publicly shared.</strong> In Google Sheets, go to{" "}
                <strong>File → Share → Share with others</strong>, then set access to{" "}
                <strong>Anyone with the link → Viewer</strong>.
              </div>

              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={!sheetUrl.trim() || isPending}
                onClick={handleFetch}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Fetch sheet
              </Button>
            </div>
          )}

          {/* ── Fetching ─────────────────────────────────────────────────── */}
          {step === "fetching" && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-semibold">Fetching your sheet…</p>
                <p className="mt-1 text-sm text-muted-foreground">Downloading and parsing the CSV.</p>
              </div>
            </div>
          )}

          {/* ── Column mapping ────────────────────────────────────────────── */}
          {step === "mapping" && parsed && (
            <div className="flex flex-col gap-5">
              {parsed.isGcFormat && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Looks like a GameChanger stats export. We auto-detected your players from the fielding columns. Review the column mapping below or click Next to continue.
                </div>
              )}

              {!hasMapped && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  We couldn&apos;t automatically detect any columns. Please assign the correct field type to each column below.
                </div>
              )}

              {/* Column mapper table */}
              <div>
                <p className="mb-2 text-sm font-semibold">Column mapping</p>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Sheet column</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Import as</th>
                        <th className="hidden px-3 py-2 text-left font-medium text-muted-foreground sm:table-cell">Sample values</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {columnMap.map((col, idx) => {
                        const samples = previewRows
                          .map((r) => r[col.index] ?? "")
                          .filter(Boolean)
                          .slice(0, 3);
                        return (
                          <tr key={idx} className={cn("bg-card", col.fieldType !== "skip" && "bg-primary/5")}>
                            <td className="px-3 py-2 font-mono font-medium text-foreground">
                              {col.header || <span className="italic text-muted-foreground">(empty)</span>}
                            </td>
                            <td className="px-3 py-2">
                              <FieldTypeSelect
                                value={col.fieldType}
                                onChange={(v) => {
                                  const next = [...columnMap];
                                  next[idx] = { ...col, fieldType: v };
                                  setColumnMap(next);
                                }}
                              />
                            </td>
                            <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                              {samples.length
                                ? samples.join(", ")
                                : <span className="italic">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Team info */}
              {!preselectedTeamId && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={createTeam}
                      onCheckedChange={(c) => setCreateTeam(c === true)}
                    />
                    <Label className="cursor-pointer text-sm">Create a new team</Label>
                  </div>

                  {createTeam && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team information</p>
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Team name *</Label>
                            <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Year *</Label>
                            <Input value={teamYear} maxLength={4} onChange={(e) => setTeamYear(e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Season</Label>
                            <Select value={teamSeason} onChange={(e) => setTeamSeason(e.target.value)}>
                              <option value="">—</option>
                              {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Division</Label>
                            <Select value={teamDiv} onChange={(e) => setTeamDiv(e.target.value)}>
                              <option value="">—</option>
                              {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Age group *</Label>
                            <Select value={teamAge} onChange={(e) => setTeamAge(e.target.value)}>
                              <option value="">Select…</option>
                              {AGE_GROUPS.map((a) => <option key={a} value={a}>{a}</option>)}
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Team type</Label>
                            <Select value={teamType} onChange={(e) => setTeamType(e.target.value)}>
                              {TEAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </Select>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Organization</Label>
                          <Input value={teamOrg} onChange={(e) => setTeamOrg(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Roster name */}
              <div className="flex flex-col gap-1">
                <Label className="text-sm font-semibold">Roster name *</Label>
                <Input value={rosterName} onChange={(e) => setRosterName(e.target.value)} />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => setStep("url")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change URL
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="flex-1"
                  disabled={createTeam && !teamName.trim()}
                  onClick={applyMapping}
                >
                  Preview players →
                </Button>
              </div>
            </div>
          )}

          {/* ── Review ───────────────────────────────────────────────────── */}
          {step === "review" && (
            <div className="flex flex-col gap-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {players.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-10 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/30" />
                  <div>
                    <p className="font-medium">No players found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Go back and check your column mapping — make sure at least one column is mapped to a name field.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setStep("mapping")}>
                    <ArrowLeft className="h-4 w-4" />
                    Adjust mapping
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    <strong>{players.length} players</strong> ready to import.
                    Click <Pencil className="inline h-3 w-3" /> to edit any player before saving.
                  </p>

                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                          <th className="hidden px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:table-cell">Positions</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((p, i) => (
                          <PlayerReviewRow
                            key={i}
                            index={i}
                            player={p}
                            editing={editingIdx === i}
                            onEdit={() => setEditingIdx(i)}
                            onSave={() => setEditingIdx(null)}
                            onChange={(updated) => {
                              const next = [...players];
                              next[i] = updated;
                              setPlayers(next);
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="flex-1"
                      onClick={() => setStep("mapping")}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Adjust mapping
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      className="flex-1"
                      disabled={isPending || players.length === 0}
                      onClick={handleImport}
                    >
                      <Users className="h-4 w-4" />
                      Import {players.length} players →
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Importing ─────────────────────────────────────────────────── */}
          {step === "importing" && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-semibold">Saving to your account…</p>
                <p className="mt-1 text-sm text-muted-foreground">Creating team, roster, and players.</p>
              </div>
            </div>
          )}

          {/* ── Done ─────────────────────────────────────────────────────── */}
          {step === "done" && doneResult && (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-semibold">Import complete!</p>
                <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what was created:</p>
              </div>

              <div className="flex w-full flex-col gap-2 text-sm">
                {doneResult.teamId && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-primary"><Building2 className="h-4 w-4" /></span>
                      Team created
                    </div>
                    <Link
                      href={`/teams/${doneResult.teamId}`}
                      className="text-primary underline underline-offset-2"
                      onClick={() => handleClose(false)}
                    >
                      View team →
                    </Link>
                  </div>
                )}
                {doneResult.rosterId && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-primary"><FileSpreadsheet className="h-4 w-4" /></span>
                      Roster created
                    </div>
                    {doneResult.teamId && (
                      <Link
                        href={`/rosters/${doneResult.teamId}/${doneResult.rosterId}`}
                        className="text-primary underline underline-offset-2"
                        onClick={() => handleClose(false)}
                      >
                        View roster →
                      </Link>
                    )}
                  </div>
                )}
                {doneResult.playerCount > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
                    <span className="text-primary"><Users className="h-4 w-4" /></span>
                    {doneResult.playerCount} player{doneResult.playerCount !== 1 ? "s" : ""} imported
                  </div>
                )}
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" size="lg" className="flex-1" onClick={reset}>
                  Import another sheet
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
