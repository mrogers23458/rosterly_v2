import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { RosterBrowser } from "@/components/rosters/roster-browser";
import { RostersPageToolbar } from "@/components/rosters/rosters-page-toolbar";
import { getUserTeamRoles } from "@/lib/permissions";
import { can } from "@/lib/constants/roles";
import type { Roster, Team } from "@/lib/constants/teams";

export default async function RostersPage() {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: rosters }, { data: teams }] = await Promise.all([
    supabase
      .from("rosters")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("teams")
      .select("*")
      .eq("is_archived", false)
      .order("name", { ascending: true }),
  ]);

  const teamList = (teams ?? []) as Team[];

  const teamRoles = user ? await getUserTeamRoles(supabase, user.id) : {};

  const writableTeams   = teamList.filter((t) => can(teamRoles[t.id], "roster:create"));
  const canCreateRoster = writableTeams.length > 0;
  const canImport       = Object.values(teamRoles).some((r) => can(r, "import:use"));

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Rosters</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All rosters across your teams.
          </p>
        </div>
        <RostersPageToolbar
          teams={teamList}
          writableTeams={writableTeams}
          canCreate={canCreateRoster}
          canImport={canImport}
        />
      </div>

      <RosterBrowser
        rosters={(rosters ?? []) as Roster[]}
        teams={teamList}
        teamRoles={teamRoles}
      />
    </div>
  );
}
