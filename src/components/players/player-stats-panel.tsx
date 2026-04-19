"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePlayerGameStat, type PlayerGameStat } from "@/app/actions/player-stats";
import { AddGameStatsModal } from "@/components/players/add-game-stats-modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/constants/roles";
import type { TeamRole } from "@/lib/constants/roles";
import type { GameLineup } from "@/lib/constants/teams";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  playerId: string;
  stats:    PlayerGameStat[];
  lineups:  GameLineup[];
  userRole: TeamRole | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  return n.toFixed(decimals);
}

function avg(hits: number, ab: number) {
  if (ab === 0) return ".000";
  return "." + Math.round((hits / ab) * 1000).toString().padStart(3, "0");
}

function era(er: number, ip: number) {
  if (ip === 0) return "—";
  return ((er / ip) * 9).toFixed(2);
}

function fp(po: number, a: number, e: number) {
  const total = po + a + e;
  if (total === 0) return "—";
  return ((po + a) / total).toFixed(3).replace("0.", ".");
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Season totals from raw rows
function computeTotals(stats: PlayerGameStat[]) {
  const t = {
    g: stats.length,
    ab: 0, h: 0, d: 0, t3: 0, hr: 0, rbi: 0, r: 0, bb: 0, k: 0, sb: 0, hbp: 0,
    ip: 0, ha: 0, ra: 0, er: 0, bba: 0, kp: 0, wp: 0, hb: 0,
    po: 0, a: 0, e: 0,
  };
  for (const s of stats) {
    t.ab  += s.at_bats;         t.h   += s.hits;
    t.d   += s.doubles;         t.t3  += s.triples;
    t.hr  += s.home_runs;       t.rbi += s.rbi;
    t.r   += s.runs;            t.bb  += s.walks;
    t.k   += s.strikeouts_bat;  t.sb  += s.stolen_bases;
    t.hbp += s.hit_by_pitch;
    t.ip  += Number(s.innings_pitched);
    t.ha  += s.hits_allowed;    t.ra  += s.runs_allowed;
    t.er  += s.earned_runs;     t.bba += s.walks_allowed;
    t.kp  += s.strikeouts_pit;  t.wp  += s.wild_pitches;
    t.hb  += s.hit_batters;
    t.po  += s.putouts;         t.a   += s.assists;
    t.e   += s.errors;
  }
  return t;
}

// ─── Delete row button ────────────────────────────────────────────────────────

function DeleteStatButton({
  statId, playerId,
}: {
  statId: string;
  playerId: string;
}) {
  const router = useRouter();
  const [error, setError]             = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  function handleDelete() {
    if (!confirm("Delete this stat entry?")) return;
    startTransition(async () => {
      const res = await deletePlayerGameStat(statId, playerId);
      if (res.error) { setError(res.error); return; }
      router.refresh();
    });
  }

  return (
    <>
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
        disabled={isPending}
        title="Delete stat entry"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlayerStatsPanel({ playerId, stats, lineups, userRole }: Props) {
  const [addOpen, setAddOpen]         = useState(false);
  const [editStat, setEditStat]       = useState<PlayerGameStat | undefined>();

  const canEdit = can(userRole, "player:edit");

  const hasBatting  = stats.some((s) => s.at_bats > 0 || s.hits > 0);
  const hasPitching = stats.some((s) => Number(s.innings_pitched) > 0);
  const hasFielding = stats.some((s) => s.putouts > 0 || s.assists > 0 || s.errors > 0);

  const totals = computeTotals(stats);

  const lineupMap = Object.fromEntries(lineups.map((l) => [l.id, l]));

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Stats</h2>
        {canEdit && (
          <Button size="sm" onClick={() => { setEditStat(undefined); setAddOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add game stats
          </Button>
        )}
      </div>

      {stats.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No stats recorded yet.
          {canEdit && ' Click "Add game stats" above to record this player\'s performance.'}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Season totals */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Season Totals ({totals.g} game{totals.g !== 1 ? "s" : ""})
            </p>

            <div className="flex flex-col gap-3">
              {/* Batting totals */}
              {hasBatting && (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-center text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {["G","AB","H","2B","3B","HR","RBI","R","BB","K","SB","HBP","AVG"].map((h) => (
                          <th key={h} className="px-2 py-2 font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-card font-medium">
                        <td className="px-2 py-2">{totals.g}</td>
                        <td className="px-2 py-2">{totals.ab}</td>
                        <td className="px-2 py-2">{totals.h}</td>
                        <td className="px-2 py-2">{totals.d}</td>
                        <td className="px-2 py-2">{totals.t3}</td>
                        <td className="px-2 py-2">{totals.hr}</td>
                        <td className="px-2 py-2">{totals.rbi}</td>
                        <td className="px-2 py-2">{totals.r}</td>
                        <td className="px-2 py-2">{totals.bb}</td>
                        <td className="px-2 py-2">{totals.k}</td>
                        <td className="px-2 py-2">{totals.sb}</td>
                        <td className="px-2 py-2">{totals.hbp}</td>
                        <td className="px-2 py-2 font-semibold">{avg(totals.h, totals.ab)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pitching totals */}
              {hasPitching && (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-center text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {["IP","H","R","ER","BB","K","WP","HBP","ERA"].map((h) => (
                          <th key={h} className="px-2 py-2 font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-card font-medium">
                        <td className="px-2 py-2">{fmt(totals.ip, 1)}</td>
                        <td className="px-2 py-2">{totals.ha}</td>
                        <td className="px-2 py-2">{totals.ra}</td>
                        <td className="px-2 py-2">{totals.er}</td>
                        <td className="px-2 py-2">{totals.bba}</td>
                        <td className="px-2 py-2">{totals.kp}</td>
                        <td className="px-2 py-2">{totals.wp}</td>
                        <td className="px-2 py-2">{totals.hb}</td>
                        <td className="px-2 py-2 font-semibold">{era(totals.er, totals.ip)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Fielding totals */}
              {hasFielding && (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-center text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {["PO","A","E","FP%"].map((h) => (
                          <th key={h} className="px-3 py-2 font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-card font-medium">
                        <td className="px-3 py-2">{totals.po}</td>
                        <td className="px-3 py-2">{totals.a}</td>
                        <td className="px-3 py-2">{totals.e}</td>
                        <td className="px-3 py-2 font-semibold">{fp(totals.po, totals.a, totals.e)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Per-game log */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Game Log
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-muted-foreground sm:table-cell">Opponent</th>
                    <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-muted-foreground md:table-cell">Lineup</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">AB</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">H</th>
                    <th className="hidden px-4 py-2.5 text-center text-xs font-medium text-muted-foreground sm:table-cell">HR</th>
                    <th className="hidden px-4 py-2.5 text-center text-xs font-medium text-muted-foreground sm:table-cell">RBI</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">AVG</th>
                    <th className="hidden px-4 py-2.5 text-center text-xs font-medium text-muted-foreground md:table-cell">IP</th>
                    <th className="hidden px-4 py-2.5 text-center text-xs font-medium text-muted-foreground md:table-cell">ERA</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      <Badge variant="muted" className="text-[10px]">Source</Badge>
                    </th>
                    {canEdit && <th className="px-4 py-2.5" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.map((s) => {
                    const linkedLineup = s.lineup_id ? lineupMap[s.lineup_id] : null;
                    const ipNum = Number(s.innings_pitched);
                    return (
                      <tr key={s.id} className="bg-card hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-sm">
                          {s.game_date ? formatDate(s.game_date) : "—"}
                        </td>
                        <td className="hidden px-4 py-2.5 text-sm text-muted-foreground sm:table-cell">
                          {s.opponent || "—"}
                        </td>
                        <td className="hidden px-4 py-2.5 text-sm text-muted-foreground md:table-cell">
                          {linkedLineup?.name ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm">{s.at_bats}</td>
                        <td className="px-4 py-2.5 text-center text-sm">{s.hits}</td>
                        <td className="hidden px-4 py-2.5 text-center text-sm sm:table-cell">{s.home_runs}</td>
                        <td className="hidden px-4 py-2.5 text-center text-sm sm:table-cell">{s.rbi}</td>
                        <td className="px-4 py-2.5 text-center text-sm font-medium">{avg(s.hits, s.at_bats)}</td>
                        <td className="hidden px-4 py-2.5 text-center text-sm md:table-cell">{fmt(ipNum, 1)}</td>
                        <td className="hidden px-4 py-2.5 text-center text-sm md:table-cell">{era(s.earned_runs, ipNum)}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="muted" className="text-[10px] capitalize">{s.source}</Badge>
                        </td>
                        {canEdit && (
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => { setEditStat(s); setAddOpen(true); }}
                                title="Edit stat entry"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <DeleteStatButton statId={s.id} playerId={playerId} />
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {canEdit && (
        <AddGameStatsModal
          playerId={playerId}
          lineups={lineups}
          existing={editStat}
          open={addOpen}
          onOpenChange={(v) => { setAddOpen(v); if (!v) setEditStat(undefined); }}
        />
      )}
    </section>
  );
}
