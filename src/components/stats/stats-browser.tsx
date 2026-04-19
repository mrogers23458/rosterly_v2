"use client";

import { BarChart3, Download, Users } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GcStatsImportModal } from "@/components/import/gc-stats-import-modal";
import type { AggregatedPlayerStat } from "@/app/stats/page";
import type { Player, Roster, Team } from "@/lib/constants/teams";
import Link from "next/link";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtAvg(hits: number, ab: number): string {
  if (ab === 0) return ".000";
  return (hits / ab).toFixed(3).replace(/^0/, "");
}

function fmtEra(er: number, ip: number): string {
  if (ip === 0) return "—";
  return ((er * 9) / ip).toFixed(2);
}

function fmtFp(po: number, a: number, e: number): string {
  const tc = po + a + e;
  if (tc === 0) return "—";
  return ((po + a) / tc).toFixed(3).replace(/^0/, "");
}

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "player" | "team";

type TeamStat = {
  team_id:         string;
  team_name:       string;
  player_count:    number;
  at_bats:         number;
  hits:            number;
  home_runs:       number;
  rbi:             number;
  runs:            number;
  walks:           number;
  strikeouts_bat:  number;
  stolen_bases:    number;
  innings_pitched: number;
  earned_runs:     number;
  strikeouts_pit:  number;
  putouts:         number;
  assists:         number;
  errors:          number;
};

// ─── Player table ─────────────────────────────────────────────────────────────

function PlayerStatsTable({ rows }: { rows: AggregatedPlayerStat[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No stats found.{" "}
        <span>Import from GameChanger or add stats manually on a player&apos;s detail page.</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">#</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Player</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground lg:table-cell">Team</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground xl:table-cell">Roster</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">AB</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">H</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-primary">AVG</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground sm:table-cell">2B</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground sm:table-cell">3B</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">HR</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">RBI</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground md:table-cell">R</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground md:table-cell">BB</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground md:table-cell">K</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground md:table-cell">SB</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground lg:table-cell">IP</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-primary lg:table-cell">ERA</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground xl:table-cell">E</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.player_id} className="hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2.5 text-xs text-muted-foreground">
                {r.jersey_number ? `#${r.jersey_number}` : "—"}
              </td>
              <td className="px-3 py-2.5 font-medium">
                <Link
                  href={`/players/${r.player_id}`}
                  className="hover:text-primary hover:underline transition-colors"
                >
                  {r.last_name}, {r.first_name}
                </Link>
              </td>
              <td className="hidden px-3 py-2.5 text-xs text-muted-foreground lg:table-cell">{r.team_name}</td>
              <td className="hidden px-3 py-2.5 text-xs text-muted-foreground xl:table-cell">{r.roster_name}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.at_bats}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.hits}</td>
              <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-primary">
                {fmtAvg(r.hits, r.at_bats)}
              </td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{r.doubles}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{r.triples}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.home_runs}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.rbi}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{r.runs}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{r.walks}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{r.strikeouts_bat}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{r.stolen_bases}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums lg:table-cell">{r.innings_pitched}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums font-semibold text-primary lg:table-cell">
                {fmtEra(r.earned_runs, r.innings_pitched)}
              </td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums xl:table-cell">{r.errors}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Team table ───────────────────────────────────────────────────────────────

function TeamStatsTable({ rows }: { rows: TeamStat[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No team stats found. Stats appear here once players have stats recorded.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Team</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Players</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">AB</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">H</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-primary">AVG</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">HR</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">RBI</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground sm:table-cell">R</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground sm:table-cell">BB</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground md:table-cell">K</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground md:table-cell">SB</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">IP</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-primary">ERA</th>
            <th className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground lg:table-cell">E</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.team_id} className="hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2.5 font-medium">{r.team_name}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.player_count}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.at_bats}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.hits}</td>
              <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-primary">
                {fmtAvg(r.hits, r.at_bats)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.home_runs}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.rbi}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{r.runs}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{r.walks}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{r.strikeouts_bat}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{r.stolen_bases}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.innings_pitched}</td>
              <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-primary">
                {fmtEra(r.earned_runs, r.innings_pitched)}
              </td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums lg:table-cell">{r.errors}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  aggregated: AggregatedPlayerStat[];
  teams:      Team[];
  rosters:    Roster[];
  players:    Player[];
};

export function StatsBrowser({ aggregated, teams, rosters, players }: Props) {
  const [view,          setView]          = useState<View>("player");
  const [teamFilter,    setTeamFilter]    = useState<string>("all");
  const [importOpen,    setImportOpen]    = useState(false);

  // ── Player view rows ────────────────────────────────────────────────────────
  const playerRows = useMemo(() => {
    if (teamFilter === "all") return aggregated;
    return aggregated.filter((r) => r.team_id === teamFilter);
  }, [aggregated, teamFilter]);

  // ── Team view rows ──────────────────────────────────────────────────────────
  const teamRows = useMemo<TeamStat[]>(() => {
    const map = new Map<string, TeamStat>();
    for (const r of aggregated) {
      if (!r.team_id) continue;
      const existing = map.get(r.team_id) ?? {
        team_id:         r.team_id,
        team_name:       r.team_name,
        player_count:    0,
        at_bats:         0,
        hits:            0,
        home_runs:       0,
        rbi:             0,
        runs:            0,
        walks:           0,
        strikeouts_bat:  0,
        stolen_bases:    0,
        innings_pitched: 0,
        earned_runs:     0,
        strikeouts_pit:  0,
        putouts:         0,
        assists:         0,
        errors:          0,
      };
      existing.player_count    += 1;
      existing.at_bats         += r.at_bats;
      existing.hits            += r.hits;
      existing.home_runs       += r.home_runs;
      existing.rbi             += r.rbi;
      existing.runs            += r.runs;
      existing.walks           += r.walks;
      existing.strikeouts_bat  += r.strikeouts_bat;
      existing.stolen_bases    += r.stolen_bases;
      existing.innings_pitched += r.innings_pitched;
      existing.earned_runs     += r.earned_runs;
      existing.strikeouts_pit  += r.strikeouts_pit;
      existing.putouts         += r.putouts;
      existing.assists         += r.assists;
      existing.errors          += r.errors;
      map.set(r.team_id, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.team_name.localeCompare(b.team_name));
  }, [aggregated]);

  const totalPlayers = view === "player" ? playerRows.length : teamRows.length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
          <button
            onClick={() => setView("player")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "player"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            By Player
          </button>
          <button
            onClick={() => setView("team")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "team"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            By Team
          </button>
        </div>

        {/* Right side: team filter (player view only) + import */}
        <div className="flex items-center gap-2">
          {view === "player" && teams.length > 0 && (
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Download className="h-4 w-4" />
            Import from GameChanger
          </Button>
        </div>
      </div>

      {/* ── Row count ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Badge variant="muted" className="text-xs">
          {totalPlayers} {view === "player" ? `player${totalPlayers !== 1 ? "s" : ""}` : `team${totalPlayers !== 1 ? "s" : ""}`}
        </Badge>
        {aggregated.length === 0 && (
          <span className="text-xs text-muted-foreground">
            No stats yet — import from GameChanger or add stats on individual player pages.
          </span>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {view === "player"
        ? <PlayerStatsTable rows={playerRows} />
        : <TeamStatsTable   rows={teamRows} />
      }

      {/* ── Import modal ─────────────────────────────────────────────────── */}
      <GcStatsImportModal
        teams={teams}
        rosters={rosters}
        players={players}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  );
}
