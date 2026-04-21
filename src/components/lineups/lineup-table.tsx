"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Minus, Plus, PlusCircle, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FIELD_POSITIONS, LINEUP_POSITIONS } from "@/lib/constants/teams";
import type { Player, Roster } from "@/lib/constants/teams";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type EntryDraft = {
  jersey_number: string;
  player_name: string;
  innings: string[];
};

export type ValidationIssue = { inning: number; missing: string[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function makeInnings(count: number): string[] {
  return Array<string>(count).fill("Bench");
}

export function entryFromPlayer(player: Player, inningCount: number): EntryDraft {
  return {
    jersey_number: player.jersey_number ?? "",
    player_name:   `${player.first_name} ${player.last_name}`,
    innings:       makeInnings(inningCount),
  };
}

export function blankEntry(inningCount: number): EntryDraft {
  return { jersey_number: "", player_name: "", innings: makeInnings(inningCount) };
}

export function validateEntries(entries: EntryDraft[], inningCount: number): ValidationIssue[] {
  return Array.from({ length: inningCount }, (_, i) => {
    const assigned = new Set(entries.map((e) => e.innings[i] ?? "Bench"));
    const missing  = FIELD_POSITIONS.filter((p) => !assigned.has(p));
    return missing.length ? { inning: i + 1, missing } : null;
  }).filter(Boolean) as ValidationIssue[];
}

// ─── Autofill algorithm ───────────────────────────────────────────────────────

const INFIELD_POS  = ["P", "C", "1B", "2B", "SS", "3B"];
const OUTFIELD_POS = ["LF", "CF", "RF"];
const ALL_FIELD    = [...INFIELD_POS, ...OUTFIELD_POS]; // 9 positions

/**
 * Autofill Bench slots in a lineup while prioritising three rules (in order):
 *  1. Every player plays ≥1 infield position [P, C, 1B, 2B, SS, 3B].
 *  2. Every player plays ≥1 outfield position [LF, CF, RF].
 *  3. No player has Bench in two or more consecutive innings.
 * After satisfying the per-player rules it fills remaining open field slots
 * per inning to maximise coverage.  User-set positions are never overridden.
 */
export function autofillLineup(entries: EntryDraft[], inningCount: number): EntryDraft[] {
  if (entries.length === 0 || inningCount === 0) return entries;

  // Deep copy + pad/trim innings to match inningCount
  const result = entries.map((e) => ({
    ...e,
    innings: Array.from({ length: inningCount }, (_, i) => e.innings[i] ?? "Bench"),
  }));

  // ── Utilities ──────────────────────────────────────────────────────────────

  /** True if no other player is already in `pos` during inning `ii`. */
  function isAvailable(pos: string, ii: number): boolean {
    return !result.some((e) => e.innings[ii] === pos);
  }

  /** True if `innings` contains Bench in any two adjacent slots. */
  function hasConsecBench(innings: string[]): boolean {
    for (let i = 0; i < innings.length - 1; i++) {
      if (innings[i] === "Bench" && innings[i + 1] === "Bench") return true;
    }
    return false;
  }

  /**
   * Find the best (inning, position) pair from `candidates` for player `pi`
   * where the player currently has Bench.  Prefers assignments that:
   *   - do NOT introduce consecutive Bench, and
   *   - fill an inning that is missing the most field positions.
   */
  function findBestSlot(pi: number, candidates: string[]): { ii: number; pos: string } | null {
    const scored: Array<{ ii: number; pos: string; score: number }> = [];

    for (let ii = 0; ii < inningCount; ii++) {
      if (result[pi].innings[ii] !== "Bench") continue;

      for (const pos of candidates) {
        if (!isAvailable(pos, ii)) continue;

        const after = result[pi].innings.map((p, i) => (i === ii ? pos : p));
        const consecOk = !hasConsecBench(after);
        // Count how many field positions are still open in this inning
        const openSlots = ALL_FIELD.filter((p) => isAvailable(p, ii)).length;
        scored.push({ ii, pos, score: (consecOk ? 10_000 : 0) + openSlots });
      }
    }

    if (scored.length === 0) return null;
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  // ── Phase 1: Each player needs ≥1 infield position ────────────────────────
  for (let pi = 0; pi < result.length; pi++) {
    if (result[pi].innings.some((p) => INFIELD_POS.includes(p))) continue;
    const slot = findBestSlot(pi, INFIELD_POS);
    if (slot) result[pi].innings[slot.ii] = slot.pos;
  }

  // ── Phase 2: Each player needs ≥1 outfield position ───────────────────────
  for (let pi = 0; pi < result.length; pi++) {
    if (result[pi].innings.some((p) => OUTFIELD_POS.includes(p))) continue;
    const slot = findBestSlot(pi, OUTFIELD_POS);
    if (slot) result[pi].innings[slot.ii] = slot.pos;
  }

  // ── Phase 3: Fix consecutive Bench (multi-pass until stable) ──────────────
  for (let pass = 0; pass < inningCount + 1; pass++) {
    let anyFixed = false;
    for (let pi = 0; pi < result.length; pi++) {
      for (let ii = 0; ii < inningCount - 1; ii++) {
        if (result[pi].innings[ii] !== "Bench" || result[pi].innings[ii + 1] !== "Bench") continue;

        // Prefer fixing the later inning so the earlier Bench can still be useful
        const tryFix = (targetIi: number) => {
          const avail = ALL_FIELD.filter((p) => isAvailable(p, targetIi));
          if (avail.length > 0) {
            result[pi].innings[targetIi] = avail[0];
            anyFixed = true;
            return true;
          }
          return false;
        };

        if (!tryFix(ii + 1)) tryFix(ii);
      }
    }
    if (!anyFixed) break;
  }

  // ── Phase 4: Fill remaining open field slots per inning ───────────────────
  for (let ii = 0; ii < inningCount; ii++) {
    const missing = ALL_FIELD.filter((p) => isAvailable(p, ii));

    for (const pos of missing) {
      // Prefer players with the most bench time (they need playing time most)
      const benchPlayers = result
        .map((e, pi) => ({ pi, benchCount: e.innings.filter((p) => p === "Bench").length }))
        .filter(({ pi }) => result[pi].innings[ii] === "Bench")
        .sort((a, b) => b.benchCount - a.benchCount);

      // First pass: respect consecutive-bench constraint
      let assigned = false;
      for (const { pi } of benchPlayers) {
        const after = result[pi].innings.map((p, i) => (i === ii ? pos : p));
        if (!hasConsecBench(after)) {
          result[pi].innings[ii] = pos;
          assigned = true;
          break;
        }
      }

      // Last resort: assign regardless (consecutive bench is better than unfilled slot)
      if (!assigned && benchPlayers.length > 0) {
        result[benchPlayers[0].pi].innings[ii] = pos;
      }
    }
  }

  return result;
}

// ─── Compact inning select ────────────────────────────────────────────────────

export function InnSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full rounded border border-input bg-background pl-1 pr-7 py-1 text-xs leading-tight focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {LINEUP_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
  );
}

// ─── Overlay position modifier ────────────────────────────────────────────────
// dnd-kit measures the full <tr> bounding rect (table-width wide) and positions
// the DragOverlay relative to that rect, which puts the pill far from the cursor.
// This modifier snaps the overlay so the cursor stays a fixed distance from the
// pill's top-left corner, regardless of how wide the underlying <tr> is.

const snapToCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (draggingNodeRect == null || activatorEvent == null) return transform;
  const { clientX, clientY } = activatorEvent as PointerEvent;
  return {
    ...transform,
    // cursor 10 px from pill's left edge, 18 px from pill's top (vertically centred)
    x: transform.x + clientX - draggingNodeRect.left - 10,
    y: transform.y + clientY - draggingNodeRect.top - 18,
  };
};

// ─── Sortable table row (dnd-kit) ─────────────────────────────────────────────

function SortableRow({
  id, entry, idx, innRange,
  onFieldChange, onInningChange, onRemove,
}: {
  id: string;
  entry: EntryDraft;
  idx: number;
  innRange: number[];
  onFieldChange: (idx: number, key: "jersey_number" | "player_name", val: string) => void;
  onInningChange: (rowIdx: number, innIdx: number, val: string) => void;
  onRemove: (idx: number) => void;
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id });

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-card transition-colors ${isDragging ? "opacity-40" : "hover:bg-muted/20"}`}
    >
      {/* Drag handle — only this cell activates the drag so inputs/selects work normally */}
      <td
        className="cursor-grab px-2 py-2 active:cursor-grabbing touch-none select-none"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/40" />
      </td>
      <td className="px-2 py-2 text-center text-xs text-muted-foreground">{idx + 1}</td>
      <td className="px-2 py-1.5">
        <Input
          value={entry.jersey_number}
          onChange={(e) => onFieldChange(idx, "jersey_number", e.target.value)}
          className="h-7 w-[52px] px-2 text-xs"
          placeholder="—"
        />
      </td>
      <td className="px-3 py-1.5">
        <Input
          value={entry.player_name}
          onChange={(e) => onFieldChange(idx, "player_name", e.target.value)}
          className="h-7 text-xs"
          placeholder="Player name"
        />
      </td>
      {innRange.map((i) => (
        <td key={i} className="px-2 py-1.5">
          <InnSelect
            value={entry.innings[i] ?? "Bench"}
            onChange={(v) => onInningChange(idx, i, v)}
          />
        </td>
      ))}
      <td className="px-1 py-1.5 text-center">
        <button
          type="button"
          onClick={() => onRemove(idx)}
          className="rounded px-1 text-sm text-muted-foreground/40 hover:text-destructive transition-colors"
          title="Remove row"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

// ─── Draggable lineup table ───────────────────────────────────────────────────

export function LineupTable({
  entries, inningCount, onEntriesChange, onAddInning, onRemoveInning, onAutofill,
  entriesVersion = 0,
}: {
  entries: EntryDraft[];
  inningCount: number;
  onEntriesChange: (e: EntryDraft[]) => void;
  onAddInning: () => void;
  onRemoveInning: () => void;
  onAutofill?: () => void;
  /**
   * Bump this number whenever the parent replaces all entries at once
   * (e.g. "load roster" / "replace from roster").  LineupTable will
   * regenerate all stable row IDs so the animation resets cleanly.
   */
  entriesVersion?: number;
}) {
  // ── Stable row IDs ──────────────────────────────────────────────────────────
  // Each entry needs a stable, unique ID that travels with it through reorders.
  // We manage a parallel `ids` array and keep it in sync with `entries`.

  const nextIdRef     = useRef(0);
  const skipSyncRef   = useRef(false);   // set true when WE cause the next entries change
  const prevVersionRef = useRef(entriesVersion);

  function makeId() { return `r${nextIdRef.current++}`; }

  const [ids, setIds] = useState<string[]>(() => entries.map(() => makeId()));

  useEffect(() => {
    // Version bump → full replace (e.g. load/replace roster): regenerate all IDs
    if (entriesVersion !== prevVersionRef.current) {
      prevVersionRef.current = entriesVersion;
      setIds(entries.map(() => makeId()));
      return;
    }

    // Internal operations (remove, reorder) already updated ids themselves
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }

    // External length change (e.g. "Add player row" button calling onEntriesChange)
    setIds((prev) => {
      if (entries.length === prev.length) return prev;
      if (entries.length > prev.length) {
        const added = Array.from({ length: entries.length - prev.length }, () => makeId());
        return [...prev, ...added];
      }
      return prev.slice(0, entries.length);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length, entriesVersion]);

  // ── DnD setup ───────────────────────────────────────────────────────────────

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const fromIdx = ids.indexOf(String(active.id));
    const toIdx   = ids.indexOf(String(over.id));
    if (fromIdx < 0 || toIdx < 0) return;

    skipSyncRef.current = true;
    setIds((prev) => arrayMove(prev, fromIdx, toIdx));
    onEntriesChange(arrayMove([...entries], fromIdx, toIdx));
  }

  // ── Entry mutations ─────────────────────────────────────────────────────────

  function updateField(idx: number, key: "jersey_number" | "player_name", val: string) {
    const next = [...entries];
    next[idx] = { ...next[idx], [key]: val };
    onEntriesChange(next);
  }

  function updateInning(rowIdx: number, innIdx: number, val: string) {
    const next = [...entries];
    const innings = [...next[rowIdx].innings];
    innings[innIdx] = val;
    next[rowIdx] = { ...next[rowIdx], innings };
    onEntriesChange(next);
  }

  function removeRow(idx: number) {
    skipSyncRef.current = true;
    setIds((prev) => prev.filter((_, i) => i !== idx));
    onEntriesChange(entries.filter((_, i) => i !== idx));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const innRange    = Array.from({ length: inningCount }, (_, i) => i);
  const activeEntry = activeId != null ? entries[ids.indexOf(activeId)] : null;

  return (
    <div className="flex flex-col gap-2">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium shrink-0">
          Players{" "}
          <span className="font-normal text-muted-foreground">({entries.length})</span>
        </span>

        {onAutofill && entries.length > 0 && (
          <button
            type="button"
            onClick={onAutofill}
            title="Autofill open positions following league rules (≥1 infield, ≥1 outfield, no consecutive bench)"
            className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/30 hover:bg-primary/5 hover:ring-primary/60 transition-all"
          >
            <Wand2 className="h-3 w-3" />
            Autofill positions
          </button>
        )}

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Innings:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRemoveInning}
              disabled={inningCount <= 1}
              className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-5 text-center font-medium">{inningCount}</span>
            <button
              type="button"
              onClick={onAddInning}
              disabled={inningCount >= 12}
              className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No players yet. Use &ldquo;Add player row&rdquo; below or go back to load a roster.
        </div>
      )}

      {/* Table wrapped in DndContext */}
      {entries.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[snapToCursor]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm" style={{ minWidth: `${480 + inningCount * 88}px` }}>
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="w-8 px-2 py-2" />
                  <th className="w-10 px-2 py-2 text-center text-xs font-medium text-muted-foreground">#</th>
                  <th className="w-[60px] px-2 py-2 text-left text-xs font-medium text-muted-foreground">Jersey</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                  {innRange.map((i) => (
                    <th key={i} className="w-[88px] px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                      Inn.&nbsp;{i + 1}
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y divide-border">
                  {entries.map((entry, idx) => (
                    <SortableRow
                      key={ids[idx] ?? idx}
                      id={ids[idx] ?? String(idx)}
                      entry={entry}
                      idx={idx}
                      innRange={innRange}
                      onFieldChange={updateField}
                      onInningChange={updateInning}
                      onRemove={removeRow}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </table>
          </div>

          {/* Floating drag ghost — sits above the dialog (z-[300]) */}
          <DragOverlay style={{ zIndex: 400 }} dropAnimation={{ duration: 150, easing: "ease" }}>
            {activeEntry ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-card px-3 py-2.5 shadow-xl ring-1 ring-primary/20 rotate-[0.5deg] scale-[1.02] opacity-90">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                <span className="font-mono text-xs text-muted-foreground">
                  #{activeEntry.jersey_number || "—"}
                </span>
                <span className="text-sm font-medium">
                  {activeEntry.player_name || "Player"}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <button
        type="button"
        onClick={() => onEntriesChange([...entries, blankEntry(inningCount)])}
        className="flex items-center gap-1.5 self-start text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <PlusCircle className="h-3.5 w-3.5" />
        Add player row
      </button>
    </div>
  );
}

// ─── Pick-roster step (shared by create + edit) ───────────────────────────────

export function PickRosterStep({
  activeRosters, rosterPlayersMap, onSelect, onBack,
}: {
  activeRosters: Roster[];
  rosterPlayersMap: Record<string, Player[]>;
  onSelect: (rosterId: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Click a roster card to load its players into the batting order.
      </p>

      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
        {activeRosters.map((roster) => {
          const playerCount = (rosterPlayersMap[roster.id] ?? []).length;
          return (
            <button
              key={roster.id}
              type="button"
              onClick={() => onSelect(roster.id)}
              className="flex h-full min-h-0 w-full flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex shrink-0 items-start justify-between gap-2">
                <p className="font-semibold text-sm leading-snug">{roster.name}</p>
                <Badge variant="success">Active</Badge>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {[roster.year, roster.season].filter(Boolean).join(" · ")}
                {playerCount > 0 && (
                  <> · {playerCount} player{playerCount !== 1 ? "s" : ""}</>
                )}
              </p>
              <div className="flex min-h-0 flex-1 flex-col">
                {roster.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{roster.notes}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={onBack}>
        ← Back
      </Button>
    </div>
  );
}

// ─── Validation warning (shared by create + edit) ────────────────────────────

import { AlertTriangle } from "lucide-react";

export function ValidationWarning({
  issues, onSaveAnyway, onReview,
}: {
  issues: ValidationIssue[];
  onSaveAnyway: () => void;
  onReview: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold text-amber-900">Not all positions are filled</p>
          <p className="mt-1 text-sm text-amber-800">
            The following innings are missing field positions:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {issues.map(({ inning, missing }) => (
              <li key={inning}>
                <span className="font-medium">Inning {inning}:</span>{" "}
                <span className="font-mono">{missing.join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onReview}>
          Review lineup
        </Button>
        <Button type="button" size="lg" className="flex-1" onClick={onSaveAnyway}>
          Save lineup anyway
        </Button>
      </div>
    </div>
  );
}
