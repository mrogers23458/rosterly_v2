"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { AvailabilityStatus, EventAvailability } from "@/lib/constants/events";

// ── Set / toggle availability for a single player ────────────────────────────

export async function setPlayerAvailability(
  eventId:  string,
  playerId: string,
  status:   AvailabilityStatus,
  notes:    string | null = null,
): Promise<{ data: EventAvailability | null; error: string | null }> {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated." };

    const { data, error } = await supabase
      .from("event_availability")
      .upsert(
        { event_id: eventId, player_id: playerId, user_id: user.id, status, notes },
        { onConflict: "event_id,player_id" },
      )
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/events/${eventId}`);
    return { data: data as EventAvailability, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ── Bulk-set all players to a default status for an event ────────────────────

export async function bulkSetAvailability(
  eventId:   string,
  playerIds: string[],
  status:    AvailabilityStatus,
): Promise<{ error: string | null }> {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const rows = playerIds.map((pid) => ({
      event_id:  eventId,
      player_id: pid,
      user_id:   user.id,
      status,
    }));

    const { error } = await supabase
      .from("event_availability")
      .upsert(rows, { onConflict: "event_id,player_id" });

    if (error) return { error: error.message };

    revalidatePath(`/events/${eventId}`);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
