"use client";

import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  createPlayerGameStat,
  updatePlayerGameStat,
  type PlayerGameStat,
  type PlayerGameStatInput,
} from "@/app/actions/player-stats";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogBody, DialogContent,
  DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GameLineup } from "@/lib/constants/teams";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  playerId: string;
  lineups:  GameLineup[];
  /** Pass a stat to edit; omit for a new stat */
  existing?: PlayerGameStat;
  open:          boolean;
  onOpenChange:  (v: boolean) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function NumField({
  id, label, value, onChange, hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      <Input
        id={id}
        type="number"
        min={0}
        step={id === "innings_pitched" ? 0.1 : 1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-8 text-sm"
      />
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

// ─── Default state builder ────────────────────────────────────────────────────

function buildDefault(existing?: PlayerGameStat): PlayerGameStatInput {
  return {
    lineup_id:       existing?.lineup_id   ?? null,
    game_date:       existing?.game_date   ?? null,
    opponent:        existing?.opponent    ?? null,
    source:          existing?.source      ?? "manual",
    at_bats:         existing?.at_bats     ?? 0,
    hits:            existing?.hits        ?? 0,
    doubles:         existing?.doubles     ?? 0,
    triples:         existing?.triples     ?? 0,
    home_runs:       existing?.home_runs   ?? 0,
    rbi:             existing?.rbi         ?? 0,
    walks:           existing?.walks       ?? 0,
    strikeouts_bat:  existing?.strikeouts_bat ?? 0,
    stolen_bases:    existing?.stolen_bases ?? 0,
    runs:            existing?.runs        ?? 0,
    hit_by_pitch:    existing?.hit_by_pitch ?? 0,
    innings_pitched: Number(existing?.innings_pitched ?? 0),
    hits_allowed:    existing?.hits_allowed    ?? 0,
    runs_allowed:    existing?.runs_allowed    ?? 0,
    earned_runs:     existing?.earned_runs     ?? 0,
    walks_allowed:   existing?.walks_allowed   ?? 0,
    strikeouts_pit:  existing?.strikeouts_pit  ?? 0,
    wild_pitches:    existing?.wild_pitches    ?? 0,
    hit_batters:     existing?.hit_batters     ?? 0,
    putouts:         existing?.putouts         ?? 0,
    assists:         existing?.assists         ?? 0,
    errors:          existing?.errors          ?? 0,
    notes:           existing?.notes           ?? null,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddGameStatsModal({
  playerId, lineups, existing, open, onOpenChange,
}: Props) {
  const router   = useRouter();
  const isEditing = Boolean(existing);

  const [form, setForm]               = useState<PlayerGameStatInput>(() => buildDefault(existing));
  const [done, setDone]               = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  // Reset when dialog opens or existing changes
  useEffect(() => {
    if (open) {
      setForm(buildDefault(existing));
      setDone(false);
      setSubmitError(null);
    }
  }, [open, existing]);

  function set<K extends keyof PlayerGameStatInput>(k: K, v: PlayerGameStatInput[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function setNum(k: keyof PlayerGameStatInput, v: number) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  // When a lineup is selected, auto-fill game_date and opponent from it
  function handleLineupChange(lineupId: string) {
    const lineup = lineups.find((l) => l.id === lineupId);
    setForm((prev) => ({
      ...prev,
      lineup_id: lineupId || null,
      game_date: lineup?.game_date ?? prev.game_date,
    }));
  }

  function handleSubmit() {
    startTransition(async () => {
      setSubmitError(null);
      const result = isEditing && existing
        ? await updatePlayerGameStat(existing.id, playerId, form)
        : await createPlayerGameStat(playerId, form);

      if (result.error) {
        setSubmitError(result.error);
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isPending) onOpenChange(v); }}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit game stats" : "Add game stats"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this player's performance stats for the game."
              : "Record this player's performance stats for a game."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex-1 overflow-y-auto">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="font-semibold">{isEditing ? "Stats updated!" : "Stats recorded!"}</p>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* ── Game context ─────────────────────────────────────── */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="stat-lineup">Game Lineup <span className="text-destructive">*</span></Label>
                  <select
                    id="stat-lineup"
                    value={form.lineup_id ?? ""}
                    onChange={(e) => handleLineupChange(e.target.value)}
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-background pl-3 pr-10 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select a lineup…</option>
                    {lineups.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                        {l.game_date ? ` — ${l.game_date}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Linking a lineup auto-fills the game date.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="stat-date">Game date</Label>
                    <Input
                      id="stat-date"
                      type="date"
                      value={form.game_date ?? ""}
                      onChange={(e) => set("game_date", e.target.value || null)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="stat-opponent">Opponent</Label>
                    <Input
                      id="stat-opponent"
                      placeholder="e.g. Blue Jays"
                      value={form.opponent ?? ""}
                      onChange={(e) => set("opponent", e.target.value || null)}
                    />
                  </div>
                </div>
              </div>

              {/* ── Batting ──────────────────────────────────────────── */}
              <SectionHeading>Batting</SectionHeading>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <NumField id="at_bats"        label="AB"  value={form.at_bats}        onChange={(v) => setNum("at_bats", v)} />
                <NumField id="hits"           label="H"   value={form.hits}           onChange={(v) => setNum("hits", v)} />
                <NumField id="doubles"        label="2B"  value={form.doubles}        onChange={(v) => setNum("doubles", v)} />
                <NumField id="triples"        label="3B"  value={form.triples}        onChange={(v) => setNum("triples", v)} />
                <NumField id="home_runs"      label="HR"  value={form.home_runs}      onChange={(v) => setNum("home_runs", v)} />
                <NumField id="rbi"            label="RBI" value={form.rbi}            onChange={(v) => setNum("rbi", v)} />
                <NumField id="runs"           label="R"   value={form.runs}           onChange={(v) => setNum("runs", v)} />
                <NumField id="walks"          label="BB"  value={form.walks}          onChange={(v) => setNum("walks", v)} />
                <NumField id="strikeouts_bat" label="K"   value={form.strikeouts_bat} onChange={(v) => setNum("strikeouts_bat", v)} />
                <NumField id="stolen_bases"   label="SB"  value={form.stolen_bases}   onChange={(v) => setNum("stolen_bases", v)} />
                <NumField id="hit_by_pitch"   label="HBP" value={form.hit_by_pitch}   onChange={(v) => setNum("hit_by_pitch", v)} />
              </div>

              {/* ── Pitching ─────────────────────────────────────────── */}
              <SectionHeading>Pitching</SectionHeading>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <NumField id="innings_pitched" label="IP"  value={form.innings_pitched} onChange={(v) => setNum("innings_pitched", v)} hint="e.g. 2.1" />
                <NumField id="hits_allowed"    label="H"   value={form.hits_allowed}    onChange={(v) => setNum("hits_allowed", v)} />
                <NumField id="runs_allowed"    label="R"   value={form.runs_allowed}    onChange={(v) => setNum("runs_allowed", v)} />
                <NumField id="earned_runs"     label="ER"  value={form.earned_runs}     onChange={(v) => setNum("earned_runs", v)} />
                <NumField id="walks_allowed"   label="BB"  value={form.walks_allowed}   onChange={(v) => setNum("walks_allowed", v)} />
                <NumField id="strikeouts_pit"  label="K"   value={form.strikeouts_pit}  onChange={(v) => setNum("strikeouts_pit", v)} />
                <NumField id="wild_pitches"    label="WP"  value={form.wild_pitches}    onChange={(v) => setNum("wild_pitches", v)} />
                <NumField id="hit_batters"     label="HBP" value={form.hit_batters}     onChange={(v) => setNum("hit_batters", v)} />
              </div>

              {/* ── Fielding ─────────────────────────────────────────── */}
              <SectionHeading>Fielding</SectionHeading>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <NumField id="putouts" label="PO" value={form.putouts} onChange={(v) => setNum("putouts", v)} />
                <NumField id="assists" label="A"  value={form.assists} onChange={(v) => setNum("assists", v)} />
                <NumField id="errors"  label="E"  value={form.errors}  onChange={(v) => setNum("errors", v)} />
              </div>

              {/* ── Notes ────────────────────────────────────────────── */}
              <div className="flex flex-col gap-1.5 border-t border-border pt-4">
                <Label htmlFor="stat-notes">Notes</Label>
                <textarea
                  id="stat-notes"
                  rows={2}
                  placeholder="Any notes about this game…"
                  value={form.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value || null)}
                  className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isPending || !form.lineup_id}>
                  {isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditing ? "Saving…" : "Recording…"}</>
                  ) : (
                    <>{isEditing ? "Save changes" : <><Plus className="mr-1 h-4 w-4" />Record stats</>}</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
