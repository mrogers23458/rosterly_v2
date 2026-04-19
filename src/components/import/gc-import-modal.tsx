"use client";

import {
  CheckCircle2, ChevronRight, FileUp, Pencil, Upload, Users, X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  importPlayers, importRoster, importTeam,
  type ImportPlayerInput, type ImportRosterInput, type ImportTeamInput,
} from "@/app/actions/import";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  AGE_GROUPS, BATS_OPTIONS, DIVISIONS, POSITIONS,
  SEASONS, TEAM_TYPES, THROWS_OPTIONS,
} from "@/lib/constants/teams";
import { parseGameChangerCSV, type ParsedGCData } from "./gc-parse";

// ─── Types ───────────────────────────────────────────────────────────────────

type Step =
  | "upload"
  | "review-team" | "team-success"
  | "review-roster" | "roster-success"
  | "review-players" | "complete";

type TeamDraft  = Omit<ImportTeamInput, never> & { age_group: string };
type RosterDraft = Omit<ImportRosterInput, "team_id">;
type PlayerDraft = ImportPlayerInput;

// ─── Small shared helpers ────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function ReadValue({ value }: { value: string | boolean | string[] | null | undefined }) {
  if (Array.isArray(value)) {
    return <span className="text-sm">{value.length ? value.join(", ") : "—"}</span>;
  }
  if (typeof value === "boolean") {
    return <Badge variant={value ? "success" : "muted"}>{value ? "Yes" : "No"}</Badge>;
  }
  return <span className="text-sm">{value || "—"}</span>;
}

function StepIndicator({ step, skipTeam = false }: { step: Step; skipTeam?: boolean }) {
  const steps: { key: Step | Step[]; label: string }[] = skipTeam
    ? [
        { key: "upload",                              label: "Upload"   },
        { key: ["review-roster", "roster-success"],   label: "Roster"   },
        { key: ["review-players", "complete"],        label: "Players"  },
      ]
    : [
        { key: "upload",                              label: "Upload"   },
        { key: ["review-team",   "team-success"],     label: "Team"     },
        { key: ["review-roster", "roster-success"],   label: "Roster"   },
        { key: ["review-players", "complete"],        label: "Players"  },
      ];
  const currentIdx = steps.findIndex((s) =>
    Array.isArray(s.key) ? s.key.includes(step) : s.key === step,
  );

  return (
    <div className="flex items-center gap-1 text-xs">
      {steps.map((s, i) => {
        const active  = i === currentIdx;
        const done    = i < currentIdx;
        return (
          <span key={i} className="flex items-center gap-1">
            <span
              className={
                done    ? "text-green-600 font-medium" :
                active  ? "text-primary font-semibold" :
                "text-muted-foreground"
              }
            >
              {done ? "✓" : i + 1}. {Array.isArray(s.key) ? s.label : s.label}
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

// ─── Step 1: Upload ──────────────────────────────────────────────────────────

function UploadStep({
  onParsed,
}: {
  onParsed: (data: ParsedGCData, filename: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile]       = useState<File | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [dragging, setDragging] = useState(false);

  function handleFile(f: File) {
    if (!f.name.endsWith(".csv")) {
      setError("Please select a .csv file exported from GameChanger.");
      return;
    }
    setFile(f);
    setError(null);
  }

  async function handleParse() {
    if (!file) return;
    setParsing(true);
    setError(null);
    try {
      const text = await file.text();
      const data = parseGameChangerCSV(text, file.name);
      onParsed(data, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse file.");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Export your team&apos;s stats from GameChanger as a <strong>.csv</strong> file, then upload
        it here. We&apos;ll extract players, positions, and team info automatically.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Drop zone */}
      <div
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileUp className="h-5 w-5 text-muted-foreground" />
        </div>
        {file ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{file.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">Drop CSV here or click to browse</p>
            <p className="text-xs text-muted-foreground">.csv files only</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      <Button
        size="lg"
        disabled={!file || parsing}
        onClick={handleParse}
        className="w-full"
      >
        <Upload className="h-4 w-4" />
        {parsing ? "Parsing…" : "Upload & Parse"}
      </Button>
    </div>
  );
}

// ─── Step 2: Review Team ──────────────────────────────────────────────────────

function ReviewTeamStep({
  draft, onChange, onSubmit, error, submitting,
}: {
  draft: TeamDraft;
  onChange: (d: TeamDraft) => void;
  onSubmit: () => void;
  error: string | null;
  submitting: boolean;
}) {
  const [editing, setEditing] = useState(false);

  function set<K extends keyof TeamDraft>(k: K, v: TeamDraft[K]) {
    onChange({ ...draft, [k]: v });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Review the team we parsed from your file. Click <strong>Edit</strong> to change any details.
      </p>

      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        {!editing ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Team details
              </span>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <FieldRow label="Name"><ReadValue value={draft.name} /></FieldRow>
              <FieldRow label="Year"><ReadValue value={draft.year} /></FieldRow>
              <FieldRow label="Season"><ReadValue value={draft.season} /></FieldRow>
              <FieldRow label="Division"><ReadValue value={draft.division} /></FieldRow>
              <FieldRow label="Age group"><ReadValue value={draft.age_group} /></FieldRow>
              <FieldRow label="Team type"><ReadValue value={draft.team_type} /></FieldRow>
              <FieldRow label="Organization"><ReadValue value={draft.organization} /></FieldRow>
              <FieldRow label="Active"><ReadValue value={draft.is_active} /></FieldRow>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Edit team details
              </span>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Done</Button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1"><Label>Team name *</Label>
                  <Input value={draft.name} onChange={(e) => set("name", e.target.value)} /></div>
                <div className="flex flex-col gap-1"><Label>Year *</Label>
                  <Input value={draft.year} maxLength={4} placeholder="2026"
                    onChange={(e) => set("year", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1"><Label>Season</Label>
                  <Select value={draft.season} onChange={(e) => set("season", e.target.value)}>
                    <option value="">—</option>
                    {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select></div>
                <div className="flex flex-col gap-1"><Label>Division</Label>
                  <Select value={draft.division} onChange={(e) => set("division", e.target.value)}>
                    <option value="">—</option>
                    {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select></div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1"><Label>Age group *</Label>
                  <Select value={draft.age_group} onChange={(e) => set("age_group", e.target.value)}>
                    <option value="">Select…</option>
                    {AGE_GROUPS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </Select></div>
                <div className="flex flex-col gap-1"><Label>Team type</Label>
                  <Select value={draft.team_type} onChange={(e) => set("team_type", e.target.value)}>
                    {TEAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select></div>
              </div>
              <div className="flex flex-col gap-1"><Label>Organization</Label>
                <Input value={draft.organization} onChange={(e) => set("organization", e.target.value)} /></div>
              <div className="flex items-center gap-2">
                <Checkbox checked={draft.is_active}
                  onCheckedChange={(c) => set("is_active", c === true)} />
                <Label className="cursor-pointer font-normal">Mark team as active</Label>
              </div>
            </div>
          </>
        )}
      </div>

      <Button
        size="lg"
        disabled={submitting || !draft.name || !draft.year || !draft.age_group}
        onClick={onSubmit}
        className="w-full"
      >
        {submitting ? "Creating team…" : "Create Team →"}
      </Button>

      {(!draft.age_group) && (
        <p className="text-center text-xs text-amber-600">
          Please set the Age group before continuing.
        </p>
      )}
    </div>
  );
}

// ─── Step 3: Review Roster ────────────────────────────────────────────────────

function ReviewRosterStep({
  draft, onChange, onSubmit, error, submitting,
}: {
  draft: RosterDraft;
  onChange: (d: RosterDraft) => void;
  onSubmit: () => void;
  error: string | null;
  submitting: boolean;
}) {
  const [editing, setEditing] = useState(false);
  function set<K extends keyof RosterDraft>(k: K, v: RosterDraft[K]) {
    onChange({ ...draft, [k]: v });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Review the roster we&apos;ll create. The default name includes today&apos;s month and year.
      </p>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        {!editing ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Roster details
              </span>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <FieldRow label="Name"><ReadValue value={draft.name} /></FieldRow>
              <FieldRow label="Season"><ReadValue value={draft.season} /></FieldRow>
              <FieldRow label="Year"><ReadValue value={draft.year} /></FieldRow>
              <FieldRow label="Active"><ReadValue value={draft.is_active} /></FieldRow>
              {draft.notes && (
                <div className="col-span-2 sm:col-span-3">
                  <FieldRow label="Notes"><ReadValue value={draft.notes} /></FieldRow>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Edit roster details
              </span>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Done</Button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1"><Label>Roster name *</Label>
                <Input value={draft.name} onChange={(e) => set("name", e.target.value)} /></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1"><Label>Season</Label>
                  <Select value={draft.season} onChange={(e) => set("season", e.target.value)}>
                    <option value="">—</option>
                    {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select></div>
                <div className="flex flex-col gap-1"><Label>Year</Label>
                  <Input value={draft.year} maxLength={4} placeholder="2026"
                    onChange={(e) => set("year", e.target.value)} /></div>
              </div>
              <div className="flex flex-col gap-1"><Label>Notes</Label>
                <textarea rows={2} value={draft.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
              <div className="flex items-center gap-2">
                <Checkbox checked={draft.is_active}
                  onCheckedChange={(c) => set("is_active", c === true)} />
                <Label className="cursor-pointer font-normal">Make active roster</Label>
              </div>
            </div>
          </>
        )}
      </div>

      <Button size="lg" disabled={submitting || !draft.name} onClick={onSubmit} className="w-full">
        {submitting ? "Creating roster…" : "Create Roster →"}
      </Button>
    </div>
  );
}

// ─── Step 4: Review Players ──────────────────────────────────────────────────

function PositionGrid({ name, selected, onChange }: {
  name: string; selected: string[];
  onChange: (pos: string, checked: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {POSITIONS.map((pos) => (
        <label key={pos} className="flex items-center gap-1 text-xs cursor-pointer">
          <Checkbox
            checked={selected.includes(pos)}
            onCheckedChange={(c) => onChange(pos, c === true)}
          />
          {pos}
        </label>
      ))}
    </div>
  );
}

function PlayerRow({
  player, index, editing, onEdit, onSave, onChange,
}: {
  player: PlayerDraft;
  index: number;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onChange: (p: PlayerDraft) => void;
}) {
  function set<K extends keyof PlayerDraft>(k: K, v: PlayerDraft[K]) {
    onChange({ ...player, [k]: v });
  }

  if (!editing) {
    return (
      <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
        <td className="px-3 py-2 text-xs text-muted-foreground">{player.jersey_number || "—"}</td>
        <td className="px-3 py-2 text-sm font-medium">{player.first_name} {player.last_name}</td>
        <td className="hidden px-3 py-2 text-xs text-muted-foreground sm:table-cell">
          {player.primary_positions.length ? (
            <><span className="text-foreground">{player.primary_positions.join(", ")}</span>
              {player.secondary_positions.length > 0 && (
                <span className="text-muted-foreground"> · {player.secondary_positions.join(", ")}</span>
              )}</>
          ) : "—"}
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

  // Expanded edit row
  return (
    <tr className="border-b border-border bg-primary/5">
      <td colSpan={5} className="px-3 py-4">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1"><Label className="text-xs">First *</Label>
              <Input className="h-8 text-xs" value={player.first_name}
                onChange={(e) => set("first_name", e.target.value)} /></div>
            <div className="flex flex-col gap-1"><Label className="text-xs">Last *</Label>
              <Input className="h-8 text-xs" value={player.last_name}
                onChange={(e) => set("last_name", e.target.value)} /></div>
            <div className="flex flex-col gap-1"><Label className="text-xs">Jersey #</Label>
              <Input className="h-8 text-xs" value={player.jersey_number}
                onChange={(e) => set("jersey_number", e.target.value)} /></div>
            <div className="flex flex-col gap-1"><Label className="text-xs">Preferred name</Label>
              <Input className="h-8 text-xs" placeholder="nickname"
                onChange={(e) => set("first_name", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1"><Label className="text-xs">Bats</Label>
              <Select className="h-8 text-xs" value={player.bats}
                onChange={(e) => set("bats", e.target.value)}>
                <option value="">—</option>
                {BATS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select></div>
            <div className="flex flex-col gap-1"><Label className="text-xs">Throws</Label>
              <Select className="h-8 text-xs" value={player.throws}
                onChange={(e) => set("throws", e.target.value)}>
                <option value="">—</option>
                {THROWS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select></div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Primary positions</Label>
            <PositionGrid name={`pp-${index}`} selected={player.primary_positions}
              onChange={(pos, c) => set("primary_positions",
                c ? [...player.primary_positions, pos] : player.primary_positions.filter((p) => p !== pos))} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Secondary positions</Label>
            <PositionGrid name={`sp-${index}`} selected={player.secondary_positions}
              onChange={(pos, c) => set("secondary_positions",
                c ? [...player.secondary_positions, pos] : player.secondary_positions.filter((p) => p !== pos))} />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={player.is_active}
                onCheckedChange={(c) => set("is_active", c === true)} />
              Active on roster
            </label>
            <Button size="sm" onClick={onSave}>Save</Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function ReviewPlayersStep({
  players, onChange, onSubmit, error, submitting,
}: {
  players: PlayerDraft[];
  onChange: (players: PlayerDraft[]) => void;
  onSubmit: () => void;
  error: string | null;
  submitting: boolean;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        <strong>{players.length} players</strong> found. Positions are inferred from fielding innings.
        Click <Pencil className="inline h-3 w-3" /> to edit any player before importing.
      </p>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

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
              <PlayerRow
                key={i}
                index={i}
                player={p}
                editing={editingIdx === i}
                onEdit={() => setEditingIdx(i)}
                onSave={() => setEditingIdx(null)}
                onChange={(updated) => {
                  const next = [...players];
                  next[i] = updated;
                  onChange(next);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Button size="lg" disabled={submitting} onClick={onSubmit} className="w-full">
        <Users className="h-4 w-4" />
        {submitting ? "Adding players…" : `Add ${players.length} Players →`}
      </Button>
    </div>
  );
}

// ─── Success banner ──────────────────────────────────────────────────────────

function SuccessBanner({
  message, cta, onCta,
}: {
  message: string; cta: string; onCta: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-7 w-7 text-green-600" />
      </div>
      <p className="font-semibold">{message}</p>
      <Button size="lg" onClick={onCta} className="w-full">{cta}</Button>
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────

export function GcImportModal({
  teamId: fixedTeamId,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  teamId?: string;
  /** When provided the modal is fully controlled — no trigger button is rendered. */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
} = {}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = setControlledOpen !== undefined;
  const open    = isControlled ? (controlledOpen ?? false) : internalOpen;
  const [step, setStep] = useState<Step>("upload");

  const [team, setTeam]       = useState<TeamDraft | null>(null);
  const [roster, setRoster]   = useState<RosterDraft | null>(null);
  const [players, setPlayers] = useState<PlayerDraft[]>([]);

  // When fixedTeamId is provided we skip team creation; this holds the
  // newly-created team id only in the full (non-skipped) flow.
  const [createdTeamId,   setCreatedTeamId]   = useState<string | null>(null);
  const [createdRosterId, setCreatedRosterId] = useState<string | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  const skipTeam  = !!fixedTeamId;
  // Resolve the team id to use for roster / players
  const resolvedTeamId = fixedTeamId ?? createdTeamId;

  function handleOpen(v: boolean) {
    if (!v) {
      setStep("upload");
      setTeam(null); setRoster(null); setPlayers([]);
      setCreatedTeamId(null); setCreatedRosterId(null);
      setSubmitError(null);
    }
    if (isControlled) setControlledOpen!(v);
    else setInternalOpen(v);
  }

  function handleParsed(data: ParsedGCData) {
    setTeam({ ...data.team, age_group: "" });
    setRoster(data.roster);
    setPlayers(data.players);
    // Skip team review when a team is already selected
    setStep(skipTeam ? "review-roster" : "review-team");
  }

  function handleCreateTeam() {
    if (!team) return;
    setSubmitError(null);
    startTransition(async () => {
      const res = await importTeam(team);
      if (res.error || !res.data) { setSubmitError(res.error ?? "Unexpected error"); return; }
      setCreatedTeamId(res.data.id);
      setStep("team-success");
    });
  }

  function handleCreateRoster() {
    if (!roster || !resolvedTeamId) return;
    setSubmitError(null);
    startTransition(async () => {
      const res = await importRoster({ ...roster, team_id: resolvedTeamId });
      if (res.error || !res.data) { setSubmitError(res.error ?? "Unexpected error"); return; }
      setCreatedRosterId(res.data.id);
      setStep("roster-success");
    });
  }

  function handleAddPlayers() {
    if (!resolvedTeamId || !createdRosterId) return;
    setSubmitError(null);
    startTransition(async () => {
      const res = await importPlayers(players, createdRosterId, resolvedTeamId);
      if (res.error) { setSubmitError(res.error); return; }
      setStep("complete");
      router.refresh();
    });
  }

  const teamName   = team?.name ?? "";
  const rosterName = roster?.name ?? "";

  return (
    <>
      {!isControlled && (
        <Button variant="outline" onClick={() => handleOpen(true)}>
          <FileUp className="h-4 w-4" />
          Import from GameChanger
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Import from GameChanger</DialogTitle>
            <DialogDescription>
              Upload a GameChanger CSV export to create a team, roster, and players.
            </DialogDescription>
            <div className="mt-1">
              <StepIndicator step={step} skipTeam={skipTeam} />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {step === "upload" && (
              <UploadStep onParsed={handleParsed} />
            )}

            {step === "review-team" && team && (
              <ReviewTeamStep
                draft={team}
                onChange={setTeam}
                onSubmit={handleCreateTeam}
                error={submitError}
                submitting={isPending}
              />
            )}

            {step === "team-success" && (
              <SuccessBanner
                message={`Team "${teamName}" created successfully!`}
                cta="Review Roster →"
                onCta={() => setStep("review-roster")}
              />
            )}

            {step === "review-roster" && roster && (
              <ReviewRosterStep
                draft={roster}
                onChange={setRoster}
                onSubmit={handleCreateRoster}
                error={submitError}
                submitting={isPending}
              />
            )}

            {step === "roster-success" && (
              <SuccessBanner
                message={`Roster "${rosterName}" created successfully!`}
                cta={`Review ${players.length} Players →`}
                onCta={() => setStep("review-players")}
              />
            )}

            {step === "review-players" && (
              <ReviewPlayersStep
                players={players}
                onChange={setPlayers}
                onSubmit={handleAddPlayers}
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
                    {players.length} players added to{" "}
                    <span className="font-medium text-foreground">{rosterName}</span>
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2">
                  {resolvedTeamId && createdRosterId && (
                    <Button size="lg" className="w-full" onClick={() => {
                      handleOpen(false);
                      router.push(`/rosters/${resolvedTeamId}/${createdRosterId}`);
                    }}>
                      View Roster
                    </Button>
                  )}
                  <Button size="lg" variant="outline" className="w-full" onClick={() => handleOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
