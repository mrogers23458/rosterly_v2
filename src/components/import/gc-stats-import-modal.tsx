"use client";

import { CheckCircle2, ChevronRight, FileUp, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  bulkImportGCStats,
  type BulkStatEntry,
} from "@/app/actions/player-stats";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  parseGameChangerStatsCSV,
  type ParsedGCPlayerStats,
} from "./gc-stats-parse";
import type { Player, Roster, Team } from "@/lib/constants/teams";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "upload" | "match" | "complete";

type MatchRow = {
  parsed:    ParsedGCPlayerStats;
  matchedId: string | null; // player.id or null = skip
};

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload",   label: "Upload"  },
    { key: "match",    label: "Match"   },
    { key: "complete", label: "Complete"},
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

function UploadStep({
  onParsed,
}: {
  onParsed: (players: ParsedGCPlayerStats[], filename: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file,    setFile]    = useState<File | null>(null);
  const [error,   setError]   = useState<string | null>(null);
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
      const data = parseGameChangerStatsCSV(text, file.name);
      onParsed(data.players, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse file.");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Upload your GameChanger <strong>season stats</strong> CSV export. Each player&apos;s
        season totals will be imported as a single stats entry.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
            <p className="text-xs text-muted-foreground">.csv files only · Season stats export</p>
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

      <Button size="lg" disabled={!file || parsing} onClick={handleParse} className="w-full">
        <Upload className="h-4 w-4" />
        {parsing ? "Parsing…" : "Upload & Parse"}
      </Button>
    </div>
  );
}

// ─── Match step ───────────────────────────────────────────────────────────────

function autoMatch(parsed: ParsedGCPlayerStats, players: Player[]): string | null {
  // 1. Exact jersey number match
  if (parsed.jersey_number) {
    const byJersey = players.find(
      (p) => p.jersey_number?.trim() === parsed.jersey_number,
    );
    if (byJersey) return byJersey.id;
  }
  // 2. Case-insensitive name match (last + first)
  const last  = parsed.last_name.toLowerCase().trim();
  const first = parsed.first_name.toLowerCase().trim();
  const byName = players.find(
    (p) =>
      p.last_name.toLowerCase().trim()  === last &&
      p.first_name.toLowerCase().trim() === first,
  );
  return byName?.id ?? null;
}

function MatchStep({
  parsedPlayers,
  filename,
  teams,
  rosters,
  players,
  matchRows,
  selectedTeamId,
  onTeamChange,
  onMatchChange,
  onSubmit,
  error,
  submitting,
}: {
  parsedPlayers:  ParsedGCPlayerStats[];
  filename:       string;
  teams:          Team[];
  rosters:        Roster[];
  players:        Player[];
  matchRows:      MatchRow[];
  selectedTeamId: string;
  onTeamChange:   (teamId: string) => void;
  onMatchChange:  (idx: number, playerId: string | null) => void;
  onSubmit:       () => void;
  error:          string | null;
  submitting:     boolean;
}) {
  // Players scoped to the selected team's rosters
  const scopedPlayers = selectedTeamId
    ? (() => {
        const teamRosterIds = new Set(
          rosters.filter((r) => r.team_id === selectedTeamId).map((r) => r.id),
        );
        return players.filter((p) => p.roster_id && teamRosterIds.has(p.roster_id));
      })()
    : players;

  const matchedCount = matchRows.filter((r) => r.matchedId !== null).length;
  const skipCount    = matchRows.filter((r) => r.matchedId === null).length;

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Team selector */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="match-team">Match players from this team</Label>
        <select
          id="match-team"
          value={selectedTeamId}
          onChange={(e) => onTeamChange(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background pl-3 pr-10 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">— All teams —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Auto-matched by jersey number first, then by name. Adjust below as needed.
        </p>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="muted">{parsedPlayers.length} players in CSV</Badge>
        <Badge variant="success">{matchedCount} matched</Badge>
        {skipCount > 0 && (
          <Badge variant="outline" className="text-muted-foreground">
            {skipCount} will be skipped
          </Badge>
        )}
      </div>

      {/* Match table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">From CSV</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground tabular-nums">AB</th>
              <th className="hidden px-3 py-2 text-right text-xs font-semibold text-muted-foreground tabular-nums sm:table-cell">IP</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Match to Player</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matchRows.map((row, i) => {
              const p = parsedPlayers[i];
              const isSkipped = row.matchedId === null;
              return (
                <tr
                  key={i}
                  className={`transition-colors ${isSkipped ? "opacity-50" : "hover:bg-muted/20"}`}
                >
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {p.jersey_number || "—"}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {p.first_name} {p.last_name}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs text-muted-foreground">
                    {p.at_bats}
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums text-xs text-muted-foreground sm:table-cell">
                    {p.innings_pitched}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.matchedId ?? ""}
                      onChange={(e) =>
                        onMatchChange(i, e.target.value || null)
                      }
                      className="h-8 w-full rounded-md border border-input bg-background pl-2 pr-9 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">— Skip player —</option>
                      {scopedPlayers.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.first_name} {sp.last_name}
                          {sp.jersey_number ? ` (#${sp.jersey_number})` : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button
        size="lg"
        disabled={submitting || matchedCount === 0}
        onClick={onSubmit}
        className="w-full"
      >
        {submitting
          ? "Importing…"
          : matchedCount > 0
          ? `Import stats for ${matchedCount} player${matchedCount !== 1 ? "s" : ""}`
          : "No players matched"}
      </Button>
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────

type Props = {
  teams:         Team[];
  rosters:       Roster[];
  players:       Player[];
  open:          boolean;
  onOpenChange:  (v: boolean) => void;
};

export function GcStatsImportModal({
  teams, rosters, players, open, onOpenChange,
}: Props) {
  const router = useRouter();

  const [step,           setStep]          = useState<Step>("upload");
  const [parsedPlayers,  setParsedPlayers]  = useState<ParsedGCPlayerStats[]>([]);
  const [filename,       setFilename]       = useState("");
  const [matchRows,      setMatchRows]      = useState<MatchRow[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [importedCount,  setImportedCount]  = useState(0);

  const [submitError,    setSubmitError]    = useState<string | null>(null);
  const [isPending,      startTransition]   = useTransition();

  function resetState() {
    setStep("upload");
    setParsedPlayers([]);
    setFilename("");
    setMatchRows([]);
    setSelectedTeamId("");
    setImportedCount(0);
    setSubmitError(null);
  }

  function handleOpen(v: boolean) {
    if (!v) resetState();
    onOpenChange(v);
  }

  function handleParsed(parsed: ParsedGCPlayerStats[], fname: string) {
    setParsedPlayers(parsed);
    setFilename(fname);
    // Auto-match each parsed player
    const rows: MatchRow[] = parsed.map((p) => ({
      parsed:    p,
      matchedId: autoMatch(p, players),
    }));
    setMatchRows(rows);
    setStep("match");
  }

  function handleTeamChange(teamId: string) {
    setSelectedTeamId(teamId);
    // Re-run auto-match with scoped players
    const scopedPlayers = teamId
      ? (() => {
          const teamRosterIds = new Set(
            rosters.filter((r) => r.team_id === teamId).map((r) => r.id),
          );
          return players.filter((p) => p.roster_id && teamRosterIds.has(p.roster_id));
        })()
      : players;

    setMatchRows((prev) =>
      prev.map((row) => ({
        ...row,
        matchedId: autoMatch(row.parsed, scopedPlayers),
      })),
    );
  }

  function handleMatchChange(idx: number, playerId: string | null) {
    setMatchRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, matchedId: playerId } : row)),
    );
  }

  function handleImport() {
    setSubmitError(null);

    const entries: BulkStatEntry[] = matchRows
      .filter((r) => r.matchedId !== null)
      .map((r) => {
        const p = r.parsed;
        const noteLabel = filename.replace(/\.csv$/i, "");
        return {
          player_id:       r.matchedId!,
          notes:           `Season stats imported from GameChanger (${noteLabel})`,
          at_bats:         p.at_bats,
          hits:            p.hits,
          doubles:         p.doubles,
          triples:         p.triples,
          home_runs:       p.home_runs,
          rbi:             p.rbi,
          walks:           p.walks,
          strikeouts_bat:  p.strikeouts_bat,
          stolen_bases:    p.stolen_bases,
          runs:            p.runs,
          hit_by_pitch:    p.hit_by_pitch,
          innings_pitched: p.innings_pitched,
          hits_allowed:    p.hits_allowed,
          runs_allowed:    p.runs_allowed,
          earned_runs:     p.earned_runs,
          walks_allowed:   p.walks_allowed,
          strikeouts_pit:  p.strikeouts_pit,
          wild_pitches:    p.wild_pitches,
          hit_batters:     p.hit_batters,
          putouts:         p.putouts,
          assists:         p.assists,
          errors:          p.errors,
        };
      });

    startTransition(async () => {
      const res = await bulkImportGCStats(entries);
      if (res.error) {
        setSubmitError(res.error);
        return;
      }
      setImportedCount(res.count);
      setStep("complete");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import stats from GameChanger</DialogTitle>
          <DialogDescription>
            Upload a GameChanger season stats CSV to add batting, pitching, and fielding
            stats to your players.
          </DialogDescription>
          <div className="mt-1">
            <StepIndicator step={step} />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {step === "upload" && (
            <UploadStep onParsed={handleParsed} />
          )}

          {step === "match" && (
            <MatchStep
              parsedPlayers={parsedPlayers}
              filename={filename}
              teams={teams}
              rosters={rosters}
              players={players}
              matchRows={matchRows}
              selectedTeamId={selectedTeamId}
              onTeamChange={handleTeamChange}
              onMatchChange={handleMatchChange}
              onSubmit={handleImport}
              error={submitError}
              submitting={isPending}
            />
          )}

          {step === "complete" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">Import complete!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Season stats imported for{" "}
                  <strong>{importedCount} player{importedCount !== 1 ? "s" : ""}</strong>.
                  View their stats on their individual player pages.
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
  );
}
