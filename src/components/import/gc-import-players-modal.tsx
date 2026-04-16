"use client";

import {
  AlertTriangle, CheckCircle2, ChevronRight, FileUp, Pencil, Upload, Users, X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { importPlayers, type ImportPlayerInput } from "@/app/actions/import";
import { mergePlayerFromImport } from "@/app/actions/players";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { BATS_OPTIONS, POSITIONS, THROWS_OPTIONS } from "@/lib/constants/teams";
import type { Player } from "@/lib/constants/teams";
import { parseGameChangerCSV } from "./gc-parse";

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = "upload" | "review" | "complete";
type Resolution = "merge" | "skip" | "add-new";

type DuplicateEntry = {
  importIdx: number;
  existing: Player;
  resolution: Resolution;
  /** Fields that will change when merged */
  mergeChanges: {
    jersey_number?: string;
    bats?: string;
    throws?: string;
    addedPrimary?: string[];
    addedSecondary?: string[];
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nameKey(first: string, last: string) {
  return `${first.toLowerCase().trim()}|${last.toLowerCase().trim()}`;
}

function computeMergeChanges(
  existing: Player,
  imp: ImportPlayerInput,
): DuplicateEntry["mergeChanges"] {
  const changes: DuplicateEntry["mergeChanges"] = {};
  if (!existing.jersey_number && imp.jersey_number) changes.jersey_number = imp.jersey_number;
  if (!existing.bats   && imp.bats)   changes.bats   = imp.bats;
  if (!existing.throws && imp.throws) changes.throws = imp.throws;

  const addedPrimary = (imp.primary_positions ?? []).filter(
    (p) => !(existing.primary_positions ?? []).includes(p),
  );
  const addedSecondary = (imp.secondary_positions ?? []).filter(
    (p) => !(existing.secondary_positions ?? []).includes(p),
  );
  if (addedPrimary.length)   changes.addedPrimary   = addedPrimary;
  if (addedSecondary.length) changes.addedSecondary = addedSecondary;
  return changes;
}

function hasMergeChanges(c: DuplicateEntry["mergeChanges"]) {
  return !!(
    c.jersey_number || c.bats || c.throws ||
    (c.addedPrimary?.length) || (c.addedSecondary?.length)
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload",   label: "Upload"   },
    { key: "review",   label: "Review"   },
    { key: "complete", label: "Complete" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center gap-1 text-xs">
      {steps.map((s, i) => {
        const active = i === currentIdx;
        const done   = i < currentIdx;
        return (
          <span key={s.key} className="flex items-center gap-1">
            <span className={
              done   ? "text-green-600 font-medium" :
              active ? "text-primary font-semibold" :
              "text-muted-foreground"
            }>
              {done ? "✓" : i + 1}. {s.label}
            </span>
            {i < steps.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            )}
          </span>
        );
      })}
    </div>
  );
}

// ─── Upload step ─────────────────────────────────────────────────────────────

function UploadStep({ onParsed }: { onParsed: (players: ImportPlayerInput[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file,    setFile]    = useState<File | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [dragging, setDragging] = useState(false);

  function handleFile(f: File) {
    if (!f.name.endsWith(".csv")) { setError("Please select a .csv file exported from GameChanger."); return; }
    setFile(f); setError(null);
  }

  async function handleParse() {
    if (!file) return;
    setParsing(true); setError(null);
    try {
      const text = await file.text();
      const data = parseGameChangerCSV(text, file.name);
      onParsed(data.players);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse file.");
    } finally { setParsing(false); }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Upload your GameChanger <strong>.csv</strong> stats export. We&apos;ll extract the player
        list and check for duplicates already on this roster.
      </p>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileUp className="h-5 w-5 text-muted-foreground" />
        </div>
        {file ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{file.name}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">Drop CSV here or click to browse</p>
            <p className="text-xs text-muted-foreground">.csv files only</p>
          </>
        )}
        <input ref={inputRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      <Button size="lg" disabled={!file || parsing} onClick={handleParse} className="w-full">
        <Upload className="h-4 w-4" />
        {parsing ? "Parsing…" : "Upload & Parse"}
      </Button>
    </div>
  );
}

// ─── Inline player editor row ─────────────────────────────────────────────────

function PlayerEditRow({
  player, index, editing, onEdit, onSave, onChange,
}: {
  player: ImportPlayerInput; index: number; editing: boolean;
  onEdit: () => void; onSave: () => void;
  onChange: (p: ImportPlayerInput) => void;
}) {
  function set<K extends keyof ImportPlayerInput>(k: K, v: ImportPlayerInput[K]) {
    onChange({ ...player, [k]: v });
  }

  if (!editing) {
    return (
      <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
        <td className="px-3 py-2 text-xs text-muted-foreground">{player.jersey_number || "—"}</td>
        <td className="px-3 py-2 text-sm font-medium">{player.first_name} {player.last_name}</td>
        <td className="hidden px-3 py-2 text-xs text-muted-foreground sm:table-cell">
          {player.primary_positions.length
            ? <><span className="text-foreground">{player.primary_positions.join(", ")}</span>
                {player.secondary_positions.length > 0 && (
                  <span className="text-muted-foreground"> · {player.secondary_positions.join(", ")}</span>
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
            <div className="flex flex-col gap-1"><Label className="text-xs">First *</Label>
              <Input className="h-8 text-xs" value={player.first_name} onChange={(e) => set("first_name", e.target.value)} /></div>
            <div className="flex flex-col gap-1"><Label className="text-xs">Last *</Label>
              <Input className="h-8 text-xs" value={player.last_name} onChange={(e) => set("last_name", e.target.value)} /></div>
            <div className="flex flex-col gap-1"><Label className="text-xs">Jersey #</Label>
              <Input className="h-8 text-xs" value={player.jersey_number} onChange={(e) => set("jersey_number", e.target.value)} /></div>
            <div className="flex flex-col gap-1"><Label className="text-xs">Bats / Throws</Label>
              <div className="flex gap-1">
                <Select className="h-8 text-xs" value={player.bats} onChange={(e) => set("bats", e.target.value)}>
                  <option value="">—</option>
                  {BATS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
                <Select className="h-8 text-xs" value={player.throws} onChange={(e) => set("throws", e.target.value)}>
                  <option value="">—</option>
                  {THROWS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Primary positions</Label>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {POSITIONS.map((pos) => (
                  <label key={pos} className="flex items-center gap-1 text-xs cursor-pointer">
                    <Checkbox checked={player.primary_positions.includes(pos)}
                      onCheckedChange={(c) => set("primary_positions",
                        c ? [...player.primary_positions, pos] : player.primary_positions.filter((p) => p !== pos))} />
                    {pos}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Secondary positions</Label>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {POSITIONS.map((pos) => (
                  <label key={pos} className="flex items-center gap-1 text-xs cursor-pointer">
                    <Checkbox checked={player.secondary_positions.includes(pos)}
                      onCheckedChange={(c) => set("secondary_positions",
                        c ? [...player.secondary_positions, pos] : player.secondary_positions.filter((p) => p !== pos))} />
                    {pos}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={player.is_active} onCheckedChange={(c) => set("is_active", c === true)} />
              Active on roster
            </label>
            <Button size="sm" onClick={onSave}>Done</Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Duplicate card ──────────────────────────────────────────────────────────

function DuplicateCard({
  entry, importPlayer, onResolutionChange,
}: {
  entry: DuplicateEntry;
  importPlayer: ImportPlayerInput;
  onResolutionChange: (r: Resolution) => void;
}) {
  const { existing, resolution, mergeChanges } = entry;
  const hasChanges = hasMergeChanges(mergeChanges);

  const mergeDescription: string[] = [];
  if (mergeChanges.jersey_number) mergeDescription.push(`Jersey → ${mergeChanges.jersey_number}`);
  if (mergeChanges.bats)          mergeDescription.push(`Bats → ${mergeChanges.bats}`);
  if (mergeChanges.throws)        mergeDescription.push(`Throws → ${mergeChanges.throws}`);
  if (mergeChanges.addedPrimary?.length)   mergeDescription.push(`+Positions: ${mergeChanges.addedPrimary.join(", ")}`);
  if (mergeChanges.addedSecondary?.length) mergeDescription.push(`+Secondary: ${mergeChanges.addedSecondary.join(", ")}`);

  return (
    <div className={`rounded-lg border p-4 ${
      resolution === "skip" ? "border-border opacity-60" :
      resolution === "merge" ? "border-amber-400/60 bg-amber-50/30" :
      "border-blue-400/60 bg-blue-50/30"
    }`}>
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />
        <span className="text-sm font-medium">
          {existing.first_name} {existing.last_name}
          {(existing.jersey_number || importPlayer.jersey_number) && (
            <span className="ml-1 text-muted-foreground">
              · #{existing.jersey_number || importPlayer.jersey_number}
            </span>
          )}
        </span>
      </div>

      {/* Side-by-side comparison */}
      <div className="mb-3 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-md border border-border bg-card p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            On Roster
          </p>
          <p><span className="text-muted-foreground">Positions: </span>
            {[...(existing.primary_positions ?? []), ...(existing.secondary_positions ?? [])].join(", ") || "—"}</p>
          <p><span className="text-muted-foreground">Jersey: </span>{existing.jersey_number || "—"}</p>
          <p><span className="text-muted-foreground">Bats / Throws: </span>
            {[existing.bats, existing.throws].filter(Boolean).join(" / ") || "—"}</p>
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            From CSV
          </p>
          <p><span className="text-muted-foreground">Positions: </span>
            {[...(importPlayer.primary_positions ?? []), ...(importPlayer.secondary_positions ?? [])].join(", ") || "—"}</p>
          <p><span className="text-muted-foreground">Jersey: </span>{importPlayer.jersey_number || "—"}</p>
          <p><span className="text-muted-foreground">Bats / Throws: </span>
            {[importPlayer.bats, importPlayer.throws].filter(Boolean).join(" / ") || "—"}</p>
        </div>
      </div>

      {/* Merge preview */}
      {resolution === "merge" && (
        <div className="mb-3 rounded-md bg-amber-100/60 px-3 py-2 text-xs text-amber-800">
          {hasChanges
            ? <>Merge will apply: {mergeDescription.join(" · ")}</>
            : "No new data to merge — this will be a no-op (existing player unchanged)."}
        </div>
      )}

      {/* Resolution buttons */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={resolution === "merge"   ? "default"     : "outline"}
          onClick={() => onResolutionChange("merge")}>
          Merge
        </Button>
        <Button size="sm" variant={resolution === "skip"    ? "secondary"   : "outline"}
          onClick={() => onResolutionChange("skip")}>
          Skip
        </Button>
        <Button size="sm" variant={resolution === "add-new" ? "secondary"   : "outline"}
          onClick={() => onResolutionChange("add-new")}>
          Add as new player
        </Button>
      </div>
    </div>
  );
}

// ─── Review step ─────────────────────────────────────────────────────────────

function ReviewStep({
  players, duplicates, onPlayersChange, onDuplicateResolution,
  onSubmit, error, submitting,
}: {
  players: ImportPlayerInput[];
  duplicates: DuplicateEntry[];
  onPlayersChange: (p: ImportPlayerInput[]) => void;
  onDuplicateResolution: (importIdx: number, r: Resolution) => void;
  onSubmit: () => void;
  error: string | null;
  submitting: boolean;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const dupIdxSet = new Set(duplicates.map((d) => d.importIdx));
  const nonDuplicates = players.map((p, i) => ({ p, i })).filter(({ i }) => !dupIdxSet.has(i));

  const unresolvedCount = duplicates.filter((d) => d.resolution === "merge" || d.resolution === "add-new").length;
  const skippedCount    = duplicates.filter((d) => d.resolution === "skip").length;
  const newCount        = nonDuplicates.length + duplicates.filter((d) => d.resolution === "add-new").length;
  const mergeCount      = duplicates.filter((d) => d.resolution === "merge").length;
  const totalAction     = newCount + mergeCount;

  return (
    <div className="flex flex-col gap-5">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Summary */}
      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
        <span className="font-medium">{players.length} players found</span>
        {duplicates.length > 0 && (
          <span className="ml-2 text-amber-700">
            · {duplicates.length} duplicate{duplicates.length !== 1 ? "s" : ""} detected
          </span>
        )}
        {skippedCount > 0 && <span className="ml-2 text-muted-foreground">· {skippedCount} will be skipped</span>}
      </div>

      {/* Duplicates section */}
      {duplicates.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-medium text-amber-700">
              {duplicates.length} potential duplicate{duplicates.length !== 1 ? "s" : ""} — choose how to handle each
            </p>
          </div>
          {duplicates.map((entry) => (
            <DuplicateCard
              key={entry.importIdx}
              entry={entry}
              importPlayer={players[entry.importIdx]}
              onResolutionChange={(r) => onDuplicateResolution(entry.importIdx, r)}
            />
          ))}
        </div>
      )}

      {/* Non-duplicate players table */}
      {nonDuplicates.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            New players <span className="text-muted-foreground font-normal">({nonDuplicates.length})</span>
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
                {nonDuplicates.map(({ p, i }) => (
                  <PlayerEditRow
                    key={i}
                    index={i}
                    player={p}
                    editing={editingIdx === i}
                    onEdit={() => setEditingIdx(i)}
                    onSave={() => setEditingIdx(null)}
                    onChange={(updated) => {
                      const next = [...players];
                      next[i] = updated;
                      onPlayersChange(next);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Button size="lg" disabled={submitting || totalAction === 0} onClick={onSubmit} className="w-full">
        <Users className="h-4 w-4" />
        {submitting ? "Importing…" : [
          newCount   > 0 && `Add ${newCount} player${newCount !== 1 ? "s" : ""}`,
          mergeCount > 0 && `Merge ${mergeCount}`,
        ].filter(Boolean).join(" · ") || "Nothing to import"}
      </Button>
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────

type Props = {
  teamId: string;
  rosterId: string;
  existingPlayers: Player[];
};

export function GcImportPlayersModal({ teamId, rosterId, existingPlayers }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");

  const [players,    setPlayers]    = useState<ImportPlayerInput[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateEntry[]>([]);

  const [importedCount, setImportedCount] = useState(0);
  const [mergedCount,   setMergedCount]   = useState(0);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  function handleOpen(v: boolean) {
    if (!v) {
      setStep("upload");
      setPlayers([]); setDuplicates([]);
      setImportedCount(0); setMergedCount(0);
      setSubmitError(null);
    }
    setOpen(v);
  }

  function handleParsed(parsed: ImportPlayerInput[]) {
    // Detect duplicates by normalized name
    const existingByName = new Map<string, Player>();
    for (const p of existingPlayers) {
      existingByName.set(nameKey(p.first_name, p.last_name), p);
    }

    const dups: DuplicateEntry[] = [];
    parsed.forEach((p, i) => {
      const existing = existingByName.get(nameKey(p.first_name, p.last_name));
      if (existing) {
        const changes = computeMergeChanges(existing, p);
        dups.push({
          importIdx: i,
          existing,
          // Default to merge when there are changes, skip when nothing to merge
          resolution: hasMergeChanges(changes) ? "merge" : "skip",
          mergeChanges: changes,
        });
      }
    });

    setPlayers(parsed);
    setDuplicates(dups);
    setStep("review");
  }

  function handleResolutionChange(importIdx: number, resolution: Resolution) {
    setDuplicates((prev) =>
      prev.map((d) => d.importIdx === importIdx ? { ...d, resolution } : d),
    );
  }

  function handleImport() {
    setSubmitError(null);

    const dupIdxSet = new Set(duplicates.map((d) => d.importIdx));

    const toAdd: ImportPlayerInput[] = [];
    const toMerge: Array<{ existingId: string; data: ImportPlayerInput }> = [];

    players.forEach((p, i) => {
      const dup = duplicates.find((d) => d.importIdx === i);
      if (dup) {
        if (dup.resolution === "merge")   toMerge.push({ existingId: dup.existing.id, data: p });
        if (dup.resolution === "add-new") toAdd.push(p);
        // "skip" → do nothing
      } else if (!dupIdxSet.has(i)) {
        toAdd.push(p);
      }
    });

    startTransition(async () => {
      // Bulk add new players
      if (toAdd.length > 0) {
        const res = await importPlayers(toAdd, rosterId, teamId);
        if (res.error) { setSubmitError(res.error); return; }
      }

      // Merge duplicates sequentially
      for (const m of toMerge) {
        const res = await mergePlayerFromImport(m.existingId, m.data, teamId, rosterId);
        if (res.error) { setSubmitError(res.error); return; }
      }

      setImportedCount(toAdd.length);
      setMergedCount(toMerge.length);
      setStep("complete");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileUp className="h-4 w-4" />
        Import from GameChanger
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import players from GameChanger</DialogTitle>
            <div className="mt-1"><StepIndicator step={step} /></div>
          </DialogHeader>

          <div className="px-6 pb-6">
            {step === "upload" && <UploadStep onParsed={handleParsed} />}

            {step === "review" && (
              <ReviewStep
                players={players}
                duplicates={duplicates}
                onPlayersChange={setPlayers}
                onDuplicateResolution={handleResolutionChange}
                onSubmit={handleImport}
                error={submitError}
                submitting={isPending}
              />
            )}

            {step === "complete" && (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Import complete!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[
                      importedCount > 0 && `${importedCount} player${importedCount !== 1 ? "s" : ""} added`,
                      mergedCount   > 0 && `${mergedCount} merged`,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button size="lg" className="w-full" onClick={() => handleOpen(false)}>
                  Done
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
