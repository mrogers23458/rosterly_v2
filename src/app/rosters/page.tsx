import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { RosterBrowser } from "@/components/rosters/roster-browser";
import { RostersPageToolbar } from "@/components/rosters/rosters-page-toolbar";
import type { Roster, Team } from "@/lib/constants/teams";

export default async function RostersPage() {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

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

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Rosters</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All rosters across your teams.
          </p>
        </div>
        <RostersPageToolbar teams={(teams ?? []) as Team[]} />
      </div>

      <RosterBrowser
        rosters={(rosters ?? []) as Roster[]}
        teams={(teams   ?? []) as Team[]}
      />
    </div>
  );
}
