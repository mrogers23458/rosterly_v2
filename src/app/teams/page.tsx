import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { TeamsArchivedSection } from "@/components/teams/teams-archived-section";
import { TeamsDirectory } from "@/components/teams/teams-directory";
import { TeamsPageToolbar } from "@/components/teams/teams-page-toolbar";
import type { Team } from "@/lib/constants/teams";

export default async function TeamsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: teams, error } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false });

  const activeTeams   = (teams as Team[] | null)?.filter((t) => !t.is_archived) ?? [];
  const archivedTeams = (teams as Team[] | null)?.filter((t) => t.is_archived) ?? [];

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Teams</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your teams and seasons. Search below, or create and import from the toolbar.
          </p>
        </div>
        {!error && <TeamsPageToolbar />}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Could not load teams. Please try again.
        </div>
      )}

      {!error && activeTeams.length === 0 && archivedTeams.length === 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          No teams yet. Use the buttons above to create your first team or import one from GameChanger.
        </p>
      )}

      {!error && activeTeams.length > 0 && <TeamsDirectory teams={activeTeams} />}

      {!error && archivedTeams.length > 0 && (
        <TeamsArchivedSection teams={archivedTeams} />
      )}
    </div>
  );
}
