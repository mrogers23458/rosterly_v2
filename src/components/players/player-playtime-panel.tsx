import { CalendarDays, Clock, Hash, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GameLineup, LineupEntry } from "@/lib/constants/teams";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LineupAppearance = {
  lineup:    GameLineup;
  entry:     LineupEntry;
};

type Props = {
  appearances: LineupAppearance[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const POSITION_COLORS: Record<string, string> = {
  P:     "border-red-300    bg-red-50    text-red-700",
  C:     "border-amber-300  bg-amber-50  text-amber-700",
  "1B":  "border-blue-300   bg-blue-50   text-blue-700",
  "2B":  "border-blue-300   bg-blue-50   text-blue-700",
  "3B":  "border-blue-300   bg-blue-50   text-blue-700",
  SS:    "border-blue-300   bg-blue-50   text-blue-700",
  LF:    "border-green-300  bg-green-50  text-green-700",
  CF:    "border-green-300  bg-green-50  text-green-700",
  RF:    "border-green-300  bg-green-50  text-green-700",
  LC:    "border-green-300  bg-green-50  text-green-700",
  RC:    "border-green-300  bg-green-50  text-green-700",
  EF:    "border-green-300  bg-green-50  text-green-700",
  Bench: "border-border     bg-muted     text-muted-foreground",
};

function positionColor(pos: string) {
  return POSITION_COLORS[pos] ?? "border-border bg-muted text-muted-foreground";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlayerPlaytimePanel({ appearances }: Props) {
  if (appearances.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-base font-semibold">Playtime Summary</h2>
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No lineup appearances found. This player will appear here once they&apos;re included in a game lineup.
        </div>
      </section>
    );
  }

  // Aggregate stats
  const totalGames = appearances.length;

  // Count innings at each position across all lineups
  const positionCounts: Record<string, number> = {};
  let totalInningsPlayed = 0;
  let totalInningsBenched = 0;
  const battingOrderCounts: Record<number, number> = {};

  for (const { entry } of appearances) {
    for (const pos of entry.innings) {
      if (!pos || pos === "") continue;
      if (pos === "Bench") {
        totalInningsBenched++;
      } else {
        totalInningsPlayed++;
        positionCounts[pos] = (positionCounts[pos] ?? 0) + 1;
      }
    }
    if (entry.batting_order) {
      battingOrderCounts[entry.batting_order] = (battingOrderCounts[entry.batting_order] ?? 0) + 1;
    }
  }

  const totalInnings = totalInningsPlayed + totalInningsBenched;
  const playedPct = totalInnings > 0 ? Math.round((totalInningsPlayed / totalInnings) * 100) : 0;

  const sortedPositions = Object.entries(positionCounts)
    .filter(([p]) => p !== "Bench")
    .sort((a, b) => b[1] - a[1]);

  const topBattingOrder = Object.entries(battingOrderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">Playtime Summary</h2>

      {/* Summary stats row */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={<CalendarDays className="h-4 w-4" />} label="Games" value={String(totalGames)} />
        <StatTile icon={<Clock className="h-4 w-4" />} label="Innings Played" value={String(totalInningsPlayed)} />
        <StatTile icon={<TrendingUp className="h-4 w-4" />} label="Play Rate" value={`${playedPct}%`} />
        <StatTile
          icon={<Hash className="h-4 w-4" />}
          label="Top Batting Spot"
          value={topBattingOrder[0] ? `#${topBattingOrder[0][0]}` : "—"}
        />
      </div>

      {/* Position breakdown */}
      {sortedPositions.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Innings by Position
          </p>
          <div className="flex flex-wrap gap-2">
            {sortedPositions.map(([pos, count]) => (
              <span
                key={pos}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                  positionColor(pos),
                )}
              >
                {pos}
                <span className="opacity-70">{count}</span>
              </span>
            ))}
            {totalInningsBenched > 0 && (
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                positionColor("Bench"),
              )}>
                Bench
                <span className="opacity-70">{totalInningsBenched}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Game-by-game appearance list */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Lineup</th>
              <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-muted-foreground sm:table-cell">Date</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Bat #</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Innings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {appearances.map(({ lineup, entry }) => (
              <tr key={lineup.id} className="bg-card">
                <td className="px-4 py-2.5 font-medium">{lineup.name}</td>
                <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">
                  {lineup.game_date ? formatDate(lineup.game_date) : "—"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {entry.batting_order ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {entry.innings.map((pos, i) => (
                      <span
                        key={i}
                        className={cn(
                          "inline-flex h-5 w-7 items-center justify-center rounded border text-[10px] font-semibold",
                          positionColor(pos || "Bench"),
                        )}
                        title={`Inn ${i + 1}: ${pos || "Bench"}`}
                      >
                        {pos || "B"}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">{icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
