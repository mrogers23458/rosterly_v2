"use client";

import {
  AlertTriangle, CalendarDays, Check, CheckCircle2, ClipboardList, Copy, LayoutList, Loader2, Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createLineup,
  fetchLineupEntries,
  fetchTeamLineups,
  type LineupEntryInput,
  type TeamLineupSummary,
} from "@/app/actions/lineups";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { CreateEventModal } from "@/components/events/create-event-modal";
import { CreateRosterModal } from "@/components/rosters/create-roster-modal";
import { cn } from "@/lib/utils";
import type { GameLineup, Player, Roster, Team } from "@/lib/constants/teams";

export type { EntryDraft };

type View = "start" | "pick-roster" | "pick-duplicate" | "form" | "warn" | "done";

// ─── Team selector field ──────────────────────────────────────────────────────

function TeamSelectorField({
  selectedTeamId,
  allTeams,
  onChange,
  className,
}: {
  selectedTeamId: string;
  allTeams:       Team[];
  onChange:       (id: string) => void;
  className?:     string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor="lineup-team">
        Team
        {!selectedTeamId && (
          <span className="ml-1.5 text-xs font-normal text-amber-600">
            (recommended — helps organize your lineups)
          </span>
        )}
      </Label>
      <select
        id="lineup-team"
        value={selectedTeamId}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background pl-3 pr-10 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">No team</option>
        {allTeams.filter((t) => !t.is_archived).map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Start step ───────────────────────────────────────────────────────────────

function StartStep({
  selectedTeamId,
  allTeams,
  allRosters,
  rosterPlayersMap,
  onTeamChange,
  onLoadRoster,
  onDuplicate,
  onManual,
  onClose,
}: {
  selectedTeamId:   string;
  allTeams:         Team[];
  allRosters:       Roster[];
  rosterPlayersMap: Record<string, Player[]>;
  onTeamChange:     (id: string) => void;
  onLoadRoster:     () => void;
  onDuplicate:      () => void;
  onManual:         () => void;
  onClose:          () => void;
}) {
  const activeRosters = useMemo(
    () => selectedTeamId
      ? allRosters.filter((r) => r.team_id === selectedTeamId && r.is_active && !r.is_archived)
      : [],
    [allRosters, selectedTeamId],
  );
  const hasActiveRosters = activeRosters.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Team selector */}
      <TeamSelectorField
        selectedTeamId={selectedTeamId}
        allTeams={allTeams}
        onChange={onTeamChange}
      />

      {/* Method picker */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onLoadRoster}
          disabled={!hasActiveRosters}
          className="flex flex-col items-center gap-3 rounded-lg border-2 border-border bg-card p-5 text-center transition-all hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Load from roster</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {!selectedTeamId
                ? "Select a team first"
                : hasActiveRosters
                  ? "Pick an active roster to pre-fill players"
                  : "No active rosters on this team"}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onDuplicate}
          className="flex flex-col items-center gap-3 rounded-lg border-2 border-border bg-card p-5 text-center transition-all hover:border-primary/50 hover:bg-primary/5"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <Copy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Duplicate a lineup</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selectedTeamId
                ? "Copy a previous lineup and adjust from there"
                : "Copy any previous lineup"}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onManual}
          className="flex flex-col items-center gap-3 rounded-lg border-2 border-border bg-card p-5 text-center transition-all hover:border-primary/50 hover:bg-primary/5"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <LayoutList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Start from scratch</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Build the lineup manually</p>
          </div>
        </button>
      </div>

      {/* Warn: no active rosters */}
      {selectedTeamId && !hasActiveRosters && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-medium">No active rosters on this team</p>
              <p className="mt-0.5 text-xs">
                Create an active roster first to load players automatically.
              </p>
              <div className="mt-3">
                <CreateRosterModal teams={allTeams} defaultTeamId={selectedTeamId} />
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

// ─── Duplicate picker step ────────────────────────────────────────────────────

function PickDuplicateStep({
  teamId,
  onSelect,
  onBack,
}: {
  teamId:   string | null;
  onSelect: (entries: EntryDraft[], source: TeamLineupSummary) => void;
  onBack:   () => void;
}) {
  const [lineups,   setLineups]   = useState<TeamLineupSummary[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    setLoading(true);
    fetchTeamLineups(teamId ?? null).then((data) => {
      setLineups(data);
      setLoading(false);
    });
  }, [teamId]);

  const filtered = lineups.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function handlePick(lineup: TeamLineupSummary) {
    setLoadingId(lineup.id);
    const rows = await fetchLineupEntries(lineup.id);
    const drafts: EntryDraft[] = rows.map((r) => ({
      jersey_number: r.jersey_number ?? "",
      player_name:   r.player_name,
      innings:       r.innings,
    }));
    setLoadingId(null);
    onSelect(drafts, lineup);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search lineups…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          autoFocus
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading lineups…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {search ? "No lineups match your search." : "No previous lineups found."}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {filtered.map((lineup) => {
            const isLoading = loadingId === lineup.id;
            return (
              <li key={lineup.id}>
                <button
                  type="button"
                  onClick={() => handlePick(lineup)}
                  disabled={!!loadingId}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
                    "hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    {isLoading
                      ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      : <Copy    className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{lineup.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {lineup.game_date
                        ? new Date(lineup.game_date + "T00:00:00").toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric", year: "numeric",
                          })
                        : "No date set"}{" "}
                      · {lineup.inning_count} inn.
                    </p>
                  </div>
                  {lineup.is_archived && (
                    <Badge variant="muted" className="shrink-0 text-xs">Archived</Badge>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Button type="button" variant="outline" className="w-full" onClick={onBack}>
        ← Back
      </Button>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

type Props = {
  /** Pre-select a team. Defaults to the user's first active team. */
  initialTeamId?:   string;
  allTeams:         Team[];
  allRosters:       Roster[];
  rosterPlayersMap: Record<string, Player[]>;
  open?:            boolean;
  onOpenChange?:    (v: boolean) => void;
};

export function CreateLineupModal({
  initialTeamId, allTeams, allRosters, rosterPlayersMap,
  open: controlledOpen, onOpenChange,
}: Props) {
  const router = useRouter();

  const activeTeams = useMemo(() => allTeams.filter((t) => !t.is_archived), [allTeams]);

  const defaultTeamId = initialTeamId ?? activeTeams[0]?.id ?? "";

  const [internalOpen,    setInternalOpen]    = useState(false);
  const isControlled = onOpenChange !== undefined;
  const open    = isControlled ? (controlledOpen ?? false) : internalOpen;

  const [view,           setView]           = useState<View>("start");
  const [selectedTeamId, setSelectedTeamId] = useState(defaultTeamId);

  const [name,     setName]     = useState("");
  const [gameDate, setGameDate] = useState("");
  const [notes,    setNotes]    = useState("");

  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  const [inningCount,      setInningCount]      = useState(6);
  const [entries,          setEntries]          = useState<EntryDraft[]>([]);
  const [entriesVersion,   setEntriesVersion]   = useState(0);

  const [issues,      setIssues]      = useState<ValidationIssue[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending,   startTransition] = useTransition();

  // "Create event after saving" feature
  const [createEventAfter, setCreateEventAfter] = useState(false);
  const [savedLineupObj,   setSavedLineupObj]   = useState<GameLineup | null>(null);
  const [eventModalOpen,   setEventModalOpen]   = useState(false);

  // Derived rosters for the currently selected team
  const activeRostersForTeam = useMemo(
    () => selectedTeamId
      ? allRosters.filter((r) => r.team_id === selectedTeamId && r.is_active && !r.is_archived)
      : [],
    [allRosters, selectedTeamId],
  );

  const rosterPlayersSlice = useMemo(() => {
    const out: Record<string, Player[]> = {};
    for (const r of activeRostersForTeam) {
      out[r.id] = rosterPlayersMap[r.id] ?? [];
    }
    return out;
  }, [activeRostersForTeam, rosterPlayersMap]);

  function reset() {
    setView("start");
    setSelectedTeamId(defaultTeamId);
    setName(""); setGameDate(""); setNotes("");
    setSelectedRosterId(null);
    setInningCount(6);
    setEntries([]); setEntriesVersion(0); setIssues([]); setSubmitError(null);
    setCreateEventAfter(false);
    setSavedLineupObj(null);
    setEventModalOpen(false);
  }

  function handleOpen(v: boolean) {
    if (!v) reset();
    if (isControlled) onOpenChange!(v);
    else setInternalOpen(v);
  }

  function handleSelectRoster(rosterId: string) {
    const players = rosterPlayersSlice[rosterId] ?? [];
    setSelectedRosterId(rosterId);
    setEntries(players.map((p) => entryFromPlayer(p, inningCount)));
    setEntriesVersion((v) => v + 1);
    setView("form");
  }

  function handleSelectDuplicate(drafts: EntryDraft[], source: TeamLineupSummary) {
    setSelectedRosterId(null);
    setInningCount(source.inning_count);
    setEntries(drafts);
    setEntriesVersion((v) => v + 1);
    setName(`Copy of ${source.name}`);
    setGameDate("");
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
        teamId:      selectedTeamId || null,
        rosterId:    selectedRosterId,
        name,
        gameDate:    gameDate || null,
        notes:       notes   || null,
        inningCount,
        entries:     inputEntries,
      });

      if (result.error) { setSubmitError(result.error); setView("form"); return; }

      // Build a minimal lineup object so the event modal can reference it
      if (result.lineupId) {
        setSavedLineupObj({
          id:           result.lineupId,
          user_id:      "",
          team_id:      selectedTeamId,
          roster_id:    selectedRosterId,
          name,
          game_date:    gameDate || null,
          inning_count: inningCount,
          notes:        notes || null,
          is_archived:  false,
          share_token:  null,
          created_at:   new Date().toISOString(),
          updated_at:   new Date().toISOString(),
        });
      }

      setView("done");
      router.refresh();
    });
  }

  const selectedRosterName = activeRostersForTeam.find((r) => r.id === selectedRosterId)?.name;
  const selectedTeamName   = activeTeams.find((t) => t.id === selectedTeamId)?.name;

  const dialogWidth =
    view === "form" || view === "warn" ? "sm:max-w-5xl" : "sm:max-w-lg";

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
            {view === "start" && (
              <DialogDescription>
                Choose how you want to build this lineup.
              </DialogDescription>
            )}
            {view === "pick-roster" && (
              <DialogDescription>Select a roster to load its players</DialogDescription>
            )}
            {view === "pick-duplicate" && (
              <DialogDescription>Choose a previous lineup to duplicate</DialogDescription>
            )}
            {view === "form" && (
              <DialogDescription>
                {selectedRosterName
                  ? `Building lineup from ${selectedRosterName}`
                  : "Building lineup · drag rows to reorder"}
              </DialogDescription>
            )}
          </DialogHeader>

          <DialogBody>
            {view === "start" && (
              <StartStep
                selectedTeamId={selectedTeamId}
                allTeams={activeTeams}
                allRosters={allRosters}
                rosterPlayersMap={rosterPlayersMap}
                onTeamChange={setSelectedTeamId}
                onLoadRoster={() => setView("pick-roster")}
                onDuplicate={() => setView("pick-duplicate")}
                onManual={handleManual}
                onClose={() => handleOpen(false)}
              />
            )}

            {view === "pick-roster" && (
              <PickRosterStep
                activeRosters={activeRostersForTeam}
                rosterPlayersMap={rosterPlayersSlice}
                onSelect={handleSelectRoster}
                onBack={() => setView("start")}
              />
            )}

            {view === "pick-duplicate" && (
              <PickDuplicateStep
                teamId={selectedTeamId || null}
                onSelect={handleSelectDuplicate}
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
                    {selectedTeamName   && <> · {selectedTeamName}</>}
                    {selectedRosterName && <> · {selectedRosterName}</>}
                  </p>
                </div>
                {createEventAfter ? (
                  <div className="flex w-full flex-col gap-2.5">
                    <Button
                      size="lg"
                      className="w-full gap-2"
                      onClick={() => setEventModalOpen(true)}
                    >
                      <CalendarDays className="h-4 w-4" />
                      Create game event
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleOpen(false)}
                    >
                      Skip — done
                    </Button>
                  </div>
                ) : (
                  <Button size="lg" className="w-full" onClick={() => handleOpen(false)}>
                    Done
                  </Button>
                )}
              </div>
            )}

            {view === "form" && (
              <div className="flex flex-col gap-5">
                {submitError && (
                  <Alert variant="destructive">
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                {/* Metadata: name, date, team */}
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
                  <TeamSelectorField
                    selectedTeamId={selectedTeamId}
                    allTeams={activeTeams}
                    onChange={setSelectedTeamId}
                  />
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

                {/* Create game event toggle */}
                <button
                  type="button"
                  onClick={() => setCreateEventAfter((v) => !v)}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                    createEventAfter
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-muted/20 hover:border-primary/20 hover:bg-muted/40",
                  )}
                >
                  <div className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    createEventAfter ? "border-primary bg-primary" : "border-input bg-background",
                  )}>
                    {createEventAfter && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Also create a game event for this lineup</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      After saving, opens the event form pre-filled with this lineup&apos;s team, date, and roster.
                    </p>
                  </div>
                </button>

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

      {/* Event modal — opens after lineup is saved when toggle is on */}
      {savedLineupObj && (
        <CreateEventModal
          open={eventModalOpen}
          onOpenChange={(v) => {
            setEventModalOpen(v);
            // When the event modal closes, close the lineup modal too
            if (!v) handleOpen(false);
          }}
          teams={activeTeams}
          rosters={allRosters}
          lineups={[savedLineupObj]}
          defaultTeamId={selectedTeamId}
          defaultLineupId={savedLineupObj.id}
          defaultRosterId={selectedRosterId ?? ""}
          defaultEventDate={gameDate}
        />
      )}
    </>
  );
}
