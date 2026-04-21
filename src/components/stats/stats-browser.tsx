"use client";

import { BarChart3, ChevronDown, ChevronUp, ChevronsUpDown, Download, Users } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GcStatsImportModal } from "@/components/import/gc-stats-import-modal";
import type { AggregatedPlayerStat } from "@/app/stats/page";
import type { Player, Roster, Team } from "@/lib/constants/teams";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcAvg(hits: number, ab: number)  { return ab  === 0 ? 0 : hits / ab; }
function calcEra(er: number, ip: number)    { return ip  === 0 ? Infinity : (er * 9) / ip; }
function calcFp(po: number, a: number, e: number) {
  const tc = po + a + e; return tc === 0 ? 1 : (po + a) / tc;
}

function fmtAvg(hits: number, ab: number): string {
  if (ab === 0) return ".000";
  return (hits / ab).toFixed(3).replace(/^0/, "");
}

function fmtEra(er: number, ip: number): string {
  if (ip === 0) return "—";
  return ((er * 9) / ip).toFixed(2);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SortDir = "asc" | "desc";
type View    = "player" | "team";

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

// ─── Sort header cell ────────────────────────────────────────────────────────

function SortTh({
  label, col, active, dir, align = "right", className = "", onClick,
}: {
  label:     string;
  col:       string;
  active:    boolean;
  dir:       SortDir;
  align?:    "left" | "right";
  className?: string;
  onClick:   (col: string) => void;
}) {
  const Icon = active ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th
      className={`whitespace-nowrap px-3 py-2.5 text-xs font-semibold ${
        align === "right" ? "text-right" : "text-left"
      } ${active ? "text-foreground" : "text-muted-foreground"} ${className}`}
    >
      <button
        type="button"
        onClick={() => onClick(col)}
        className={`inline-flex items-center gap-0.5 transition-colors hover:text-foreground ${
          align === "right" ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {label}
        <Icon className={`h-3 w-3 shrink-0 ${active ? "opacity-100" : "opacity-40"}`} />
      </button>
    </th>
  );
}

// ─── Player sort keys ─────────────────────────────────────────────────────────

type PlayerSortKey =
  | "name" | "team" | "jersey"
  | "at_bats" | "hits" | "avg" | "doubles" | "triples" | "home_runs"
  | "rbi" | "runs" | "walks" | "strikeouts_bat" | "stolen_bases" | "hit_by_pitch"
  | "innings_pitched" | "era" | "strikeouts_pit" | "walks_allowed"
  | "putouts" | "assists" | "errors";

function playerSortVal(r: AggregatedPlayerStat, key: PlayerSortKey): number | string {
  switch (key) {
    case "name":    return `${r.last_name} ${r.first_name}`.toLowerCase();
    case "team":    return r.team_name.toLowerCase();
    case "jersey":  return parseInt(r.jersey_number ?? "9999") || 9999;
    case "avg":     return calcAvg(r.hits, r.at_bats);
    case "era":     return calcEra(r.earned_runs, r.innings_pitched);
    case "at_bats":        return r.at_bats;
    case "hits":           return r.hits;
    case "doubles":        return r.doubles;
    case "triples":        return r.triples;
    case "home_runs":      return r.home_runs;
    case "rbi":            return r.rbi;
    case "runs":           return r.runs;
    case "walks":          return r.walks;
    case "strikeouts_bat": return r.strikeouts_bat;
    case "stolen_bases":   return r.stolen_bases;
    case "hit_by_pitch":   return r.hit_by_pitch;
    case "innings_pitched":return r.innings_pitched;
    case "strikeouts_pit": return r.strikeouts_pit;
    case "walks_allowed":  return r.walks_allowed;
    case "putouts":        return r.putouts;
    case "assists":        return r.assists;
    case "errors":         return r.errors;
    default: return 0;
  }
}

function sortPlayers(
  rows: AggregatedPlayerStat[],
  key: PlayerSortKey,
  dir: SortDir,
): AggregatedPlayerStat[] {
  return [...rows].sort((a, b) => {
    const av = playerSortVal(a, key);
    const bv = playerSortVal(b, key);
    let cmp: number;
    if (typeof av === "string") {
      cmp = av.localeCompare(bv as string);
    } else {
      // ERA Infinity (no IP) always sorts to the bottom regardless of direction
      if (av === Infinity && bv === Infinity) cmp = 0;
      else if (av === Infinity) cmp = 1;
      else if (bv === Infinity) cmp = -1;
      else cmp = (av as number) - (bv as number);
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── Player table ─────────────────────────────────────────────────────────────

function PlayerStatsTable({ rows }: { rows: AggregatedPlayerStat[] }) {
  const [sortKey, setSortKey] = useState<PlayerSortKey>("avg");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(col: string) {
    const c = col as PlayerSortKey;
    if (c === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(c);
      // Name / team sort ascending first; stats sort descending first
      setSortDir(c === "name" || c === "team" || c === "jersey" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => sortPlayers(rows, sortKey, sortDir), [rows, sortKey, sortDir]);

  function th(label: string, col: PlayerSortKey, className = "") {
    return (
      <SortTh
        label={label} col={col}
        active={sortKey === col} dir={sortDir}
        onClick={handleSort} className={className}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No stats found.{" "}
        Import from GameChanger or add stats manually on a player&apos;s detail page.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <SortTh label="#"      col="jersey" active={sortKey === "jersey"} dir={sortDir} onClick={handleSort} align="left"  />
            <SortTh label="Player" col="name"   active={sortKey === "name"}   dir={sortDir} onClick={handleSort} align="left"  />
            <SortTh label="Team"   col="team"   active={sortKey === "team"}   dir={sortDir} onClick={handleSort} align="left"
              className="hidden lg:table-cell" />
            {th("AB",  "at_bats")}
            {th("H",   "hits")}
            {th("AVG", "avg")}
            {th("2B",  "doubles",       "hidden sm:table-cell")}
            {th("3B",  "triples",       "hidden sm:table-cell")}
            {th("HR",  "home_runs")}
            {th("RBI", "rbi")}
            {th("R",   "runs",          "hidden md:table-cell")}
            {th("BB",  "walks",         "hidden md:table-cell")}
            {th("K",   "strikeouts_bat","hidden md:table-cell")}
            {th("SB",  "stolen_bases",  "hidden md:table-cell")}
            {th("IP",  "innings_pitched","hidden lg:table-cell")}
            {th("ERA", "era",           "hidden lg:table-cell")}
            {th("E",   "errors",        "hidden xl:table-cell")}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((r) => (
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
              <td className="px-3 py-2.5 text-right tabular-nums">{r.at_bats}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.hits}</td>
              <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${sortKey === "avg" ? "text-primary" : ""}`}>
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
              <td className={`hidden px-3 py-2.5 text-right tabular-nums font-semibold lg:table-cell ${sortKey === "era" ? "text-primary" : ""}`}>
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

// ─── Team sort keys ───────────────────────────────────────────────────────────

type TeamSortKey =
  | "name" | "player_count"
  | "at_bats" | "hits" | "avg" | "home_runs" | "rbi" | "runs"
  | "walks" | "strikeouts_bat" | "stolen_bases"
  | "innings_pitched" | "era" | "errors";

function teamSortVal(r: TeamStat, key: TeamSortKey): number | string {
  switch (key) {
    case "name":           return r.team_name.toLowerCase();
    case "player_count":   return r.player_count;
    case "avg":            return calcAvg(r.hits, r.at_bats);
    case "era":            return calcEra(r.earned_runs, r.innings_pitched);
    case "at_bats":        return r.at_bats;
    case "hits":           return r.hits;
    case "home_runs":      return r.home_runs;
    case "rbi":            return r.rbi;
    case "runs":           return r.runs;
    case "walks":          return r.walks;
    case "strikeouts_bat": return r.strikeouts_bat;
    case "stolen_bases":   return r.stolen_bases;
    case "innings_pitched":return r.innings_pitched;
    case "errors":         return r.errors;
    default: return 0;
  }
}

function sortTeams(rows: TeamStat[], key: TeamSortKey, dir: SortDir): TeamStat[] {
  return [...rows].sort((a, b) => {
    const av = teamSortVal(a, key);
    const bv = teamSortVal(b, key);
    let cmp: number;
    if (typeof av === "string") {
      cmp = av.localeCompare(bv as string);
    } else {
      if (av === Infinity && bv === Infinity) cmp = 0;
      else if (av === Infinity) cmp = 1;
      else if (bv === Infinity) cmp = -1;
      else cmp = (av as number) - (bv as number);
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── Team table ───────────────────────────────────────────────────────────────

function TeamStatsTable({ rows }: { rows: TeamStat[] }) {
  const [sortKey, setSortKey] = useState<TeamSortKey>("avg");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(col: string) {
    const c = col as TeamSortKey;
    if (c === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(c);
      setSortDir(c === "name" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => sortTeams(rows, sortKey, sortDir), [rows, sortKey, sortDir]);

  function th(label: string, col: TeamSortKey, className = "") {
    return (
      <SortTh
        label={label} col={col}
        active={sortKey === col} dir={sortDir}
        onClick={handleSort} className={className}
      />
    );
  }

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
            <SortTh label="Team"    col="name"         active={sortKey === "name"}         dir={sortDir} onClick={handleSort} align="left" />
            {th("Players", "player_count")}
            {th("AB",  "at_bats")}
            {th("H",   "hits")}
            {th("AVG", "avg")}
            {th("HR",  "home_runs")}
            {th("RBI", "rbi")}
            {th("R",   "runs",          "hidden sm:table-cell")}
            {th("BB",  "walks",         "hidden sm:table-cell")}
            {th("K",   "strikeouts_bat","hidden md:table-cell")}
            {th("SB",  "stolen_bases",  "hidden md:table-cell")}
            {th("IP",  "innings_pitched")}
            {th("ERA", "era")}
            {th("E",   "errors",        "hidden lg:table-cell")}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((r) => (
            <tr key={r.team_id} className="hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2.5 font-medium">{r.team_name}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.player_count}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.at_bats}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.hits}</td>
              <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${sortKey === "avg" ? "text-primary" : ""}`}>
                {fmtAvg(r.hits, r.at_bats)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.home_runs}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.rbi}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{r.runs}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{r.walks}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{r.strikeouts_bat}</td>
              <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{r.stolen_bases}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.innings_pitched}</td>
              <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${sortKey === "era" ? "text-primary" : ""}`}>
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
  const [view,       setView]       = useState<View>("player");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [importOpen, setImportOpen] = useState(false);

  const playerRows = useMemo(() => {
    if (teamFilter === "all") return aggregated;
    return aggregated.filter((r) => r.team_id === teamFilter);
  }, [aggregated, teamFilter]);

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
    return Array.from(map.values());
  }, [aggregated]);

  const totalCount = view === "player" ? playerRows.length : teamRows.length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {view === "player" && teams.length > 0 && (
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background pl-3 pr-10 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring sm:w-auto"
            >
              <option value="all">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <Button variant="outline" onClick={() => setImportOpen(true)} className="w-full sm:w-auto">
            <Download className="h-4 w-4" />
            Import from GameChanger
          </Button>
        </div>
      </div>

      {/* ── Row count ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Badge variant="muted" className="text-xs">
          {totalCount}{" "}
          {view === "player"
            ? `player${totalCount !== 1 ? "s" : ""}`
            : `team${totalCount !== 1 ? "s" : ""}`}
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
        : <TeamStatsTable   rows={teamRows}   />
      }

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
