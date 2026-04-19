import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { TeamsPageContent } from "@/components/teams/teams-page-content";
import { getUserTeamRoles } from "@/lib/permissions";
import type { Team } from "@/lib/constants/teams";
import type { TeamRole } from "@/lib/constants/roles";

export default async function TeamsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  const { data: teams, error } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false });

  const teamRoles: Record<string, TeamRole> = user
    ? await getUserTeamRoles(supabase, user.id)
    : {};

  const activeTeams   = (teams as Team[] | null)?.filter((t) => !t.is_archived) ?? [];
  const archivedTeams = (teams as Team[] | null)?.filter((t) => t.is_archived) ?? [];

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      <TeamsPageContent
        activeTeams={activeTeams}
        archivedTeams={archivedTeams}
        teamRoles={teamRoles}
        error={!!error}
      />
    </div>
  );
}
