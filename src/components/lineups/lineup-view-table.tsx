import { cn } from "@/lib/utils";
import type { LineupEntry } from "@/lib/constants/teams";

// ─── Position colour mapping ──────────────────────────────────────────────────

const POSITION_STYLES: Record<string, string> = {
  P:     "bg-rose-100    text-rose-800    dark:bg-rose-900/40    dark:text-rose-300",
  C:     "bg-orange-100  text-orange-800  dark:bg-orange-900/40  dark:text-orange-300",
  "1B":  "bg-sky-100     text-sky-800     dark:bg-sky-900/40     dark:text-sky-300",
  "2B":  "bg-sky-100     text-sky-800     dark:bg-sky-900/40     dark:text-sky-300",
  SS:    "bg-sky-100     text-sky-800     dark:bg-sky-900/40     dark:text-sky-300",
  "3B":  "bg-sky-100     text-sky-800     dark:bg-sky-900/40     dark:text-sky-300",
  LF:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  CF:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  RF:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  Bench: "bg-muted/60    text-muted-foreground",
};

function PositionCell({ pos }: { pos: string }) {
  const style = POSITION_STYLES[pos] ?? "bg-muted/60 text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex min-w-[36px] items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none",
        style,
      )}
    >
      {pos}
    </span>
  );
}

// ─── Read-only lineup table ───────────────────────────────────────────────────

type Props = {
  entries: LineupEntry[];
  inningCount: number;
};

export function LineupViewTable({ entries, inningCount }: Props) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        No players in this lineup yet.
      </p>
    );
  }

  const innRange = Array.from({ length: inningCount }, (_, i) => i);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table
        className="w-full text-sm"
        style={{ minWidth: `${440 + inningCount * 80}px` }}
      >
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="w-10 px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">
              #
            </th>
            <th className="w-[60px] px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Jersey
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Player
            </th>
            {innRange.map((i) => (
              <th
                key={i}
                className="w-[80px] px-2 py-2.5 text-center text-xs font-medium text-muted-foreground"
              >
                Inn.&nbsp;{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry, idx) => (
            <tr
              key={entry.id}
              className="bg-card transition-colors hover:bg-muted/20"
            >
              <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">
                {idx + 1}
              </td>
              <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                {entry.jersey_number ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-sm font-medium">{entry.player_name}</td>
              {innRange.map((i) => (
                <td key={i} className="px-2 py-2.5 text-center">
                  <PositionCell pos={entry.innings[i] ?? "Bench"} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
