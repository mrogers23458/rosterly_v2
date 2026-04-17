import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import type { TeamEvent } from "@/lib/constants/events";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().split("T")[0];

  const [
    { data: teams },
    { data: upcomingEvents },
    { data: allTeamsForMap },
  ] = await Promise.all([
    supabase.from("teams").select("id, name").limit(1),
    supabase
      .from("events")
      .select("*")
      .gte("event_date", today)
      .eq("is_archived", false)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false })
      .limit(20),
    supabase.from("teams").select("id, name"),
  ]);

  const hasTeams = Boolean(teams?.length);
  const teamMap  = Object.fromEntries(
    (allTeamsForMap ?? []).map((t) => [t.id, t.name as string]),
  );

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      <DashboardGrid
        upcomingEvents={(upcomingEvents ?? []) as TeamEvent[]}
        teamMap={teamMap}
        hasTeams={hasTeams}
        userEmail={user?.email ?? undefined}
      />
    </div>
  );
}
