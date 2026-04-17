import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { AiSetupWidget } from "@/components/import/ai-setup-widget";
import { ManualSetupWidget } from "@/components/dashboard/manual-setup-widget";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { Badge } from "@/components/ui/badge";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatGameDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();

  const todayStr    = now.toDateString();
  const tomorrowStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString();

  if (d.toDateString() === todayStr)    return "Today";
  if (d.toDateString() === tomorrowStr) return "Tomorrow";

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
  });
}

function daysUntil(dateStr: string): number {
  const d   = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86_400_000);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().split("T")[0];

  const [
    { data: teams },
    { data: upcomingLineups },
    { data: allTeamsForMap },
  ] = await Promise.all([
    supabase.from("teams").select("id, name").limit(1),
    supabase
      .from("game_lineups")
      .select("id, name, game_date, team_id, inning_count")
      .gte("game_date", today)
      .eq("is_archived", false)
      .not("game_date", "is", null)
      .order("game_date", { ascending: true })
      .limit(6),
    supabase.from("teams").select("id, name"),
  ]);

  const hasTeams = Boolean(teams?.length);
  const teamMap  = Object.fromEntries((allTeamsForMap ?? []).map((t) => [t.id, t.name as string]));

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>

      {/* ── No teams: setup widgets ── */}
      {!hasTeams && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AiSetupWidget />
          <ManualSetupWidget />
        </div>
      )}

      {/* ── Widgets grid ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Upcoming games — takes 2/3 on large screens */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Upcoming Games</h2>
              </div>
              {hasTeams && (
                <Link
                  href="/lineups"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all →
                </Link>
              )}
            </div>

            {!upcomingLineups?.length ? (
              <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
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
                        href={lineup.team_id ? `/teams/${lineup.team_id}` : "/lineups"}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors"
                      >
                        <div
                          className={`flex w-20 shrink-0 flex-col items-center rounded-md px-2 py-1.5 text-center text-xs font-medium ${
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : isSoon
                              ? "bg-amber-100 text-amber-800"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {formatGameDate(lineup.game_date!)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{lineup.name}</p>
                          {lineup.team_id && teamMap[lineup.team_id] && (
                            <p className="truncate text-xs text-muted-foreground">
                              {teamMap[lineup.team_id]}
                            </p>
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
        </div>

        {/* Right column — weather + AI setup widget (always visible) */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <WeatherWidget />
          <AiSetupWidget />
        </div>
      </div>

      {/* Greeting when teams exist but no note needed */}
      {hasTeams && (
        <p className="mt-6 text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user?.email}</span>
        </p>
      )}
    </div>
  );
}
