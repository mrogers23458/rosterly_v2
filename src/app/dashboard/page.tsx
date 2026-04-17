import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";

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
  const teamMap  = Object.fromEntries(
    (allTeamsForMap ?? []).map((t) => [t.id, t.name as string]),
  );

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      <DashboardGrid
        upcomingLineups={(upcomingLineups ?? []) as {
          id: string;
          name: string;
          game_date: string | null;
          team_id: string;
          inning_count: number;
        }[]}
        teamMap={teamMap}
        hasTeams={hasTeams}
        userEmail={user?.email ?? undefined}
      />
    </div>
  );
}
