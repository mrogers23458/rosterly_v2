"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { EventRsvp, RsvpStatus } from "@/lib/constants/events";

// ── Set / update the current user's RSVP ─────────────────────────────────────

export async function setEventRsvp(
  eventId: string,
  status:  RsvpStatus,
  note:    string | null = null,
): Promise<{ data: EventRsvp | null; error: string | null }> {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated." };

    // Derive a display name from auth metadata (Google name, or email prefix)
    const meta = user.user_metadata as Record<string, string> | undefined;
    const responder_name =
      meta?.full_name ||
      meta?.name ||
      user.email?.split("@")[0] ||
      null;

    const { data, error } = await supabase
      .from("event_rsvps")
      .upsert(
        { event_id: eventId, user_id: user.id, status, note, responder_name },
        { onConflict: "event_id,user_id" },
      )
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/events/${eventId}`);
    return { data: data as EventRsvp, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ── Remove the current user's RSVP ───────────────────────────────────────────

export async function removeEventRsvp(
  eventId: string,
): Promise<{ error: string | null }> {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const { error } = await supabase
      .from("event_rsvps")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);

    if (error) return { error: error.message };

    revalidatePath(`/events/${eventId}`);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
