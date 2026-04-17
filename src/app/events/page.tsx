import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { EventBrowser } from "@/components/events/event-browser";
import { EventsPageToolbar } from "@/components/events/events-page-toolbar";
import type { Roster, Team } from "@/lib/constants/teams";
import type { TeamEvent } from "@/lib/constants/events";

export default async function EventsPage() {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const [{ data: events }, { data: teams }, { data: rosters }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("is_archived", false)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("teams")
      .select("*")
      .eq("is_archived", false)
      .order("name", { ascending: true }),
    supabase
      .from("rosters")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Games, practices, and scrimmages for your team.
          </p>
        </div>
        <EventsPageToolbar
          teams={(teams ?? []) as Team[]}
          rosters={(rosters ?? []) as Roster[]}
        />
      </div>

      <EventBrowser
        events={(events ?? []) as TeamEvent[]}
        teams={(teams ?? []) as Team[]}
        rosters={(rosters ?? []) as Roster[]}
      />
    </div>
  );
}
