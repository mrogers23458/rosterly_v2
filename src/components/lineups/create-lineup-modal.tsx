"use client";

import {
  AlertTriangle, CheckCircle2, ClipboardList, LayoutList,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createLineup, type LineupEntryInput } from "@/app/actions/lineups";
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
import { CreateRosterModal } from "@/components/rosters/create-roster-modal";
import type { Player, Roster, Team } from "@/lib/constants/teams";

// re-export so consumers that need EntryDraft don't have to know about lineup-table
export type { EntryDraft };

type View = "start" | "pick-roster" | "form" | "warn" | "done";

// ─── Start step ───────────────────────────────────────────────────────────────

function StartStep({
  hasActiveRosters, allTeams, teamId, onLoadRoster, onManual, onClose,
}: {
  hasActiveRosters: boolean;
  allTeams: Team[];
  teamId: string;
  onLoadRoster: () => void;
  onManual: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onLoadRoster}
          disabled={!hasActiveRosters}
          className="flex flex-col items-center gap-3 rounded-lg border-2 border-border bg-card p-6 text-center transition-all hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Load existing roster</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {hasActiveRosters
                ? "Pick an active roster to populate the batting order"
                : "No active rosters on this team"}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onManual}
          className="flex flex-col items-center gap-3 rounded-lg border-2 border-border bg-card p-6 text-center transition-all hover:border-primary/50 hover:bg-primary/5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LayoutList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Add players manually</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Build the lineup from scratch</p>
          </div>
        </button>
      </div>

      {!hasActiveRosters && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">No active rosters on this team</p>
              <p className="mt-0.5 text-xs">
                Create an active roster first to load players automatically.
              </p>
              <div className="mt-3">
                <CreateRosterModal teams={allTeams} defaultTeamId={teamId} />
              </div>
            </div>
          </div>
        </div>
      )}

      <Button type="button" variant="outline" className="w-full" onClick={onClose}>
        Cancel
      </Button>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

type Props = {
  teamId: string;
  activeRosters: Roster[];
  rosterPlayersMap: Record<string, Player[]>;
  allTeams: Team[];
  /** When provided the modal is fully controlled — no trigger button is rendered. */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
};

export function CreateLineupModal({
  teamId, activeRosters, rosterPlayersMap, allTeams,
  open: controlledOpen, onOpenChange,
}: Props) {
  const router = useRouter();

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = onOpenChange !== undefined;
  const open    = isControlled ? (controlledOpen ?? false) : internalOpen;
  const [view, setView] = useState<View>("start");

  const [name,     setName]     = useState("");
  const [gameDate, setGameDate] = useState("");
  const [notes,    setNotes]    = useState("");

  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  const [inningCount,      setInningCount]      = useState(6);
  const [entries,          setEntries]          = useState<EntryDraft[]>([]);
  const [entriesVersion,   setEntriesVersion]   = useState(0);

  const [issues,      setIssues]      = useState<ValidationIssue[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  function reset() {
    setView("start");
    setName(""); setGameDate(""); setNotes("");
    setSelectedRosterId(null);
    setInningCount(6);
    setEntries([]); setEntriesVersion(0); setIssues([]); setSubmitError(null);
  }

  function handleOpen(v: boolean) {
    if (!v) reset();
    if (isControlled) onOpenChange!(v);
    else setInternalOpen(v);
  }

  function handleSelectRoster(rosterId: string) {
    const players = rosterPlayersMap[rosterId] ?? [];
    setSelectedRosterId(rosterId);
    setEntries(players.map((p) => entryFromPlayer(p, inningCount)));
    setEntriesVersion((v) => v + 1);
    setView("form");
  }

  function handleManual() {
    setSelectedRosterId(null);
    setEntries([]);
    setView("form");
  }

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

  function handleSave() {
    setSubmitError(null);
    if (!name.trim()) { setSubmitError("Lineup name is required."); return; }
    const validation = validateEntries(entries, inningCount);
    if (validation.length > 0) { setIssues(validation); setView("warn"); return; }
    submitLineup();
  }

  function submitLineup() {
    startTransition(async () => {
      const inputEntries: LineupEntryInput[] = entries.map((e, i) => ({
        batting_order: i + 1,
        jersey_number: e.jersey_number,
        player_name:   e.player_name,
        innings:       e.innings,
      }));

      const result = await createLineup({
        teamId,
        rosterId:    selectedRosterId,
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

  const selectedRosterName = activeRosters.find((r) => r.id === selectedRosterId)?.name;
  const dialogWidth = view === "form" || view === "warn" ? "sm:max-w-5xl" : "sm:max-w-lg";

  return (
    <>
      {!isControlled && (
        <Button onClick={() => handleOpen(true)}>
          <LayoutList className="h-4 w-4" />
          Create Lineup
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className={`max-h-[92vh] overflow-y-auto ${dialogWidth}`}>
          <DialogHeader>
            <DialogTitle>Create game lineup</DialogTitle>
            {view === "pick-roster" && (
              <DialogDescription>Select a roster to load its players</DialogDescription>
            )}
            {view === "form" && (
              <DialogDescription>
                {selectedRosterName
                  ? `Building lineup from ${selectedRosterName}`
                  : "Building lineup manually · drag rows to reorder"}
              </DialogDescription>
            )}
          </DialogHeader>

          <DialogBody>
            {view === "start" && (
              <StartStep
                hasActiveRosters={activeRosters.length > 0}
                allTeams={allTeams}
                teamId={teamId}
                onLoadRoster={() => setView("pick-roster")}
                onManual={handleManual}
                onClose={() => handleOpen(false)}
              />
            )}

            {view === "pick-roster" && (
              <PickRosterStep
                activeRosters={activeRosters}
                rosterPlayersMap={rosterPlayersMap}
                onSelect={handleSelectRoster}
                onBack={() => setView("start")}
              />
            )}

            {view === "warn" && (
              <ValidationWarning
                issues={issues}
                onSaveAnyway={submitLineup}
                onReview={() => setView("form")}
              />
            )}

            {view === "done" && (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Lineup saved!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{name}</span>
                    {selectedRosterName && <> · {selectedRosterName}</>}
                  </p>
                </div>
                <Button size="lg" className="w-full" onClick={() => handleOpen(false)}>
                  Done
                </Button>
              </div>
            )}

            {view === "form" && (
              <div className="flex flex-col gap-5">
                {submitError && (
                  <Alert variant="destructive">
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="lineup-name">
                      Lineup name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="lineup-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. vs. Blue Jays — Game 4"
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lineup-date">Game date</Label>
                    <Input
                      id="lineup-date"
                      type="date"
                      value={gameDate}
                      onChange={(e) => setGameDate(e.target.value)}
                    />
                  </div>
                </div>

                <LineupTable
                  entries={entries}
                  inningCount={inningCount}
                  onEntriesChange={setEntries}
                  onAddInning={addInning}
                  onRemoveInning={removeInning}
                  onAutofill={() => setEntries(autofillLineup(entries, inningCount))}
                  entriesVersion={entriesVersion}
                />

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lineup-notes">Notes</Label>
                  <textarea
                    id="lineup-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional game notes…"
                    className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => setView("start")}
                  >
                    ← Back
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    className="flex-1"
                    disabled={isPending || !name.trim()}
                    onClick={handleSave}
                  >
                    {isPending ? "Saving…" : "Save lineup"}
                  </Button>
                </div>
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
