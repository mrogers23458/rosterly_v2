"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  REMINDER_KIND_LABELS,
  unitToMinutes,
  type EventReminder,
  type ReminderDraft,
} from "@/lib/constants/reminders";

// ── Save reminders for an event (replace-all strategy) ───────────────────────

export async function saveEventReminders(
  eventId: string,
  drafts: ReminderDraft[],
  options?: { scope?: "this" | "all"; recurrenceGroupId?: string | null },
): Promise<{ error: string | null }> {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    let targetEventIds = [eventId];
    if (options?.scope === "all" && options.recurrenceGroupId) {
      const { data: seriesRows, error: seriesErr } = await supabase
        .from("events")
        .select("id")
        .eq("recurrence_group_id", options.recurrenceGroupId)
        .eq("user_id", user.id);

      if (seriesErr) return { error: seriesErr.message };
      targetEventIds = (seriesRows ?? []).map((r: { id: string }) => r.id);
      if (targetEventIds.length === 0) targetEventIds = [eventId];
    }

    // Build flat rows: one row per (channel, minutesBefore) pair
    const rows = targetEventIds.flatMap((targetEventId) =>
      drafts.flatMap((d) => {
        const minutes = d.kind === "rsvp_follow_up" ? 0 : unitToMinutes(d.amount, d.unit);
        return d.channels.map((channel) => ({
          event_id:       targetEventId,
          user_id:        user.id,
          kind:           d.kind,
          audience:       REMINDER_KIND_LABELS[d.kind].audience,
          channel,
          minutes_before: minutes,
        }));
      }),
    );

    // Delete existing reminders for this event first, then insert new ones
    const { error: delErr } = await supabase
      .from("event_reminders")
      .delete()
      .in("event_id", targetEventIds)
      .eq("user_id", user.id);

    if (delErr) return { error: delErr.message };

    if (rows.length > 0) {
      const { error: insErr } = await supabase
        .from("event_reminders")
        .insert(rows);
      if (insErr) return { error: insErr.message };
    }

    for (const targetEventId of targetEventIds) {
      revalidatePath(`/events/${targetEventId}`);
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function saveEventRemindersForEventIds(
  eventIds: string[],
  drafts: ReminderDraft[],
): Promise<{ error: string | null }> {
  try {
    if (eventIds.length === 0) return { error: "No event IDs provided." };
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const rows = eventIds.flatMap((targetEventId) =>
      drafts.flatMap((d) => {
        const minutes = d.kind === "rsvp_follow_up" ? 0 : unitToMinutes(d.amount, d.unit);
        return d.channels.map((channel) => ({
          event_id:       targetEventId,
          user_id:        user.id,
          kind:           d.kind,
          audience:       REMINDER_KIND_LABELS[d.kind].audience,
          channel,
          minutes_before: minutes,
        }));
      }),
    );

    const { error: delErr } = await supabase
      .from("event_reminders")
      .delete()
      .in("event_id", eventIds)
      .eq("user_id", user.id);
    if (delErr) return { error: delErr.message };

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("event_reminders").insert(rows);
      if (insErr) return { error: insErr.message };
    }

    for (const eventId of eventIds) {
      revalidatePath(`/events/${eventId}`);
    }

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ── Load reminders for an event ───────────────────────────────────────────────

export async function getEventReminders(
  eventId: string,
): Promise<{ data: EventReminder[]; error: string | null }> {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);

    const { data, error } = await supabase
      .from("event_reminders")
      .select("*")
      .eq("event_id", eventId)
      .order("minutes_before", { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as EventReminder[], error: null };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ── Mark in-app notifications as read ────────────────────────────────────────

export async function markNotificationsRead(
  ids: string[],
): Promise<{ error: string | null }> {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids)
      .eq("user_id", user.id);

    revalidatePath("/notifications");
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ── Delete notifications ──────────────────────────────────────────────────────

/** Delete specific notifications by id. Pass an empty array to delete all. */
export async function deleteNotifications(
  ids: string[] | "all",
): Promise<{ error: string | null }> {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const query = supabase.from("notifications").delete().eq("user_id", user.id);
    const { error } = ids === "all" ? await query : await query.in("id", ids);

    revalidatePath("/notifications");
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

