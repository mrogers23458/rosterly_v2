"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  fetchLineupEntries,
  updateLineupFull,
  type LineupEntryInput,
} from "@/app/actions/lineups";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogBody, DialogContent,
  DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EntryDraft, LineupTable, PickRosterStep, ValidationIssue, ValidationWarning,
  autofillLineup, entryFromPlayer, validateEntries,
} from "@/components/lineups/lineup-table";
import type { GameLineup, Player, Roster } from "@/lib/constants/teams";

type EditView = "loading" | "form" | "replace-roster" | "warn" | "done";

type Props = {
  lineup: GameLineup;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  activeRosters: Roster[];
  rosterPlayersMap: Record<string, Player[]>;
};

export function EditLineupModal({
  lineup, open, onOpenChange, activeRosters, rosterPlayersMap,
}: Props) {
  const router = useRouter();

  const [view,     setView]     = useState<EditView>("loading");
  const [name,     setName]     = useState("");
  const [gameDate, setGameDate] = useState("");
  const [notes,    setNotes]    = useState("");
  const [inningCount,    setInningCount]    = useState(lineup.inning_count);
  const [entries,        setEntries]        = useState<EntryDraft[]>([]);
  const [entriesVersion, setEntriesVersion] = useState(0);
  const [issues,         setIssues]         = useState<ValidationIssue[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  // ── Fetch entries whenever the modal opens ──────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setView("loading");
    setSubmitError(null);
    setIssues([]);

    let cancelled = false;
    fetchLineupEntries(lineup.id).then((data) => {
      if (cancelled) return;
      setName(lineup.name);
      setGameDate(lineup.game_date ?? "");
      setNotes(lineup.notes ?? "");
      setInningCount(lineup.inning_count);
      setEntries(
        data.map((e) => ({
          jersey_number: e.jersey_number ?? "",
          player_name:   e.player_name,
          innings:       e.innings,
        })),
      );
      setEntriesVersion((v) => v + 1);
      setView("form");
    });

    return () => { cancelled = true; };
  }, [open, lineup.id, lineup.name, lineup.game_date, lineup.notes, lineup.inning_count]);

  // ── Inning controls ─────────────────────────────────────────────────────────
  function addInning() {
    if (inningCount >= 12) return;
    setInningCount((n) => n + 1);
    setEntries((prev) => prev.map((e) => ({ ...e, innings: [...e.innings, "Bench"] })));
  }

  function removeInning() {
    if (inningCount <= 1) return;
    setInningCount((n) => n - 1);
    setEntries((prev) => prev.map((e) => ({ ...e, innings: e.innings.slice(0, -1) })));
  }

  // ── Replace from roster ─────────────────────────────────────────────────────
  function handleSelectReplaceRoster(rosterId: string) {
    const players = rosterPlayersMap[rosterId] ?? [];
    setEntries(players.map((p) => entryFromPlayer(p, inningCount)));
    setEntriesVersion((v) => v + 1);
    setView("form");
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  function handleSave() {
    setSubmitError(null);
    if (!name.trim()) { setSubmitError("Lineup name is required."); return; }
    const validation = validateEntries(entries, inningCount);
    if (validation.length > 0) { setIssues(validation); setView("warn"); return; }
    submitUpdate();
  }

  function submitUpdate() {
    startTransition(async () => {
      const inputEntries: LineupEntryInput[] = entries.map((e, i) => ({
        batting_order: i + 1,
        jersey_number: e.jersey_number,
        player_name:   e.player_name,
        innings:       e.innings,
      }));

      const result = await updateLineupFull({
        lineupId:    lineup.id,
        teamId:      lineup.team_id,
        name,
        gameDate:    gameDate || null,
        notes:       notes   || null,
        inningCount,
        entries:     inputEntries,
      });

      if (result.error) { setSubmitError(result.error); setView("form"); return; }
      setView("done");
      router.refresh();
    });
  }

  const dialogWidth =
    view === "form" || view === "replace-roster" || view === "warn"
      ? "sm:max-w-5xl"
      : "sm:max-w-lg";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[92vh] overflow-y-auto ${dialogWidth}`}>
        <DialogHeader>
          <DialogTitle>Edit lineup</DialogTitle>
          {view === "form" && (
            <DialogDescription>
              Editing <span className="font-medium text-foreground">{lineup.name}</span>
              {activeRosters.length > 0 && (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => setView("replace-roster")}
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    Replace from roster
                  </button>
                </>
              )}
            </DialogDescription>
          )}
          {view === "replace-roster" && (
            <DialogDescription>Select a roster to replace current players</DialogDescription>
          )}
        </DialogHeader>

        <DialogBody>
          {/* ── Loading ──────────────────────────────────── */}
          {view === "loading" && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Loading lineup…</p>
            </div>
          )}

          {/* ── Replace roster picker ────────────────────── */}
          {view === "replace-roster" && (
            <PickRosterStep
              activeRosters={activeRosters}
              rosterPlayersMap={rosterPlayersMap}
              onSelect={handleSelectReplaceRoster}
              onBack={() => setView("form")}
            />
          )}

          {/* ── Validation warning ───────────────────────── */}
          {view === "warn" && (
            <ValidationWarning
              issues={issues}
              onSaveAnyway={submitUpdate}
              onReview={() => setView("form")}
            />
          )}

          {/* ── Done ────────────────────────────────────── */}
          {view === "done" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">Lineup updated!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{name}</span>
                </p>
              </div>
              <Button size="lg" className="w-full" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          )}

          {/* ── Form ────────────────────────────────────── */}
          {view === "form" && (
            <div className="flex flex-col gap-5">
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              {/* Metadata row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="edit-lineup-name">
                    Lineup name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-lineup-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. vs. Blue Jays — Game 4"
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-lineup-date">Game date</Label>
                  <Input
                    id="edit-lineup-date"
                    type="date"
                    value={gameDate}
                    onChange={(e) => setGameDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Draggable lineup table with dynamic innings */}
              <LineupTable
                entries={entries}
                inningCount={inningCount}
                onEntriesChange={setEntries}
                onAddInning={addInning}
                onRemoveInning={removeInning}
                onAutofill={() => setEntries(autofillLineup(entries, inningCount))}
                entriesVersion={entriesVersion}
              />

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-lineup-notes">Notes</Label>
                <textarea
                  id="edit-lineup-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional game notes…"
                  className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="flex-1"
                  disabled={isPending || !name.trim()}
                  onClick={handleSave}
                >
                  {isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
