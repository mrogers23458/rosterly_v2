import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

function formatGameDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const todayStr    = now.toDateString();
  const tomorrowStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString();
  if (d.toDateString() === todayStr)    return "Today";
  if (d.toDateString() === tomorrowStr) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86_400_000);
}

type Lineup = {
  id: string;
  name: string;
  game_date: string | null;
  team_id: string;
  inning_count: number;
};

type Props = {
  upcomingLineups: Lineup[];
  teamMap: Record<string, string>;
  hasTeams: boolean;
};

export function UpcomingGamesWidget({ upcomingLineups, teamMap, hasTeams }: Props) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Upcoming Games</h2>
        </div>
        {hasTeams && (
          <Link href="/lineups" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            View all →
          </Link>
        )}
      </div>

      {!upcomingLineups.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No upcoming games scheduled.</p>
          {hasTeams && (
            <p className="text-xs text-muted-foreground">
              Set a game date when creating a lineup to see it here.
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {upcomingLineups.map((lineup) => {
            const days    = daysUntil(lineup.game_date!);
            const isToday = days === 0;
            const isSoon  = days <= 3;
            return (
              <li key={lineup.id}>
                <Link
                  href={lineup.team_id ? `/lineups/${lineup.id}` : "/lineups"}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <div className={`flex w-20 shrink-0 flex-col items-center rounded-md px-2 py-1.5 text-center text-xs font-medium ${
                    isToday ? "bg-primary text-primary-foreground"
                    : isSoon ? "bg-amber-100 text-amber-800"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {formatGameDate(lineup.game_date!)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{lineup.name}</p>
                    {lineup.team_id && teamMap[lineup.team_id] && (
                      <p className="truncate text-xs text-muted-foreground">{teamMap[lineup.team_id]}</p>
                    )}
                  </div>
                  <Badge variant="muted" className="shrink-0 text-xs">
                    {lineup.inning_count} inn.
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
