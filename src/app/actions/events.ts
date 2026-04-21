"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type {
  CreateEventInput,
  RecurrenceType,
  TeamEvent,
  UpdateEventInput,
} from "@/lib/constants/events";

async function getAuthenticatedClient() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return { supabase, user };
}

/** Generate every occurrence date between startDate and endDate (inclusive), capped at 104. */
function generateRecurringDates(
  startDate: string,
  endDate: string,
  type: RecurrenceType,
): string[] {
  const dates: string[] = [];
  const end = new Date(endDate + "T00:00:00");
  const current = new Date(startDate + "T00:00:00");
  const MAX = 104; // ~2 years of weekly events

  while (current <= end && dates.length < MAX) {
    dates.push(current.toISOString().slice(0, 10));
    if (type === "daily")        current.setDate(current.getDate() + 1);
    else if (type === "weekly")  current.setDate(current.getDate() + 7);
    else if (type === "monthly") current.setMonth(current.getMonth() + 1);
  }
  return dates;
}

export async function createEvent(
  input: CreateEventInput,
): Promise<{ data: TeamEvent | null; error: string | null; created_event_ids: string[] }> {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    const base = {
      user_id:    user.id,
      team_id:    input.team_id    || null,
      roster_id:  input.roster_id  || null,
      lineup_id:  input.lineup_id  || null,
      type:       input.type,
      title:      input.title.trim(),
      opponent:   input.opponent?.trim()   || null,
      start_time: input.start_time?.trim() || null,
      end_time:   input.end_time?.trim()   || null,
      location:   input.location?.trim()   || null,
      notes:      input.notes?.trim()      || null,
      rsvp_deadline_at: input.rsvp_deadline_at || null,
      is_home:    input.is_home,
    };

    // ── Recurring: insert one row per occurrence ──────────────────────────
    if (input.recurrence_type && input.recurrence_end_date) {
      const groupId = crypto.randomUUID();
      const dates   = generateRecurringDates(
        input.event_date,
        input.recurrence_end_date,
        input.recurrence_type,
      );

      const rows = dates.map((date) => ({
        ...base,
        event_date:          date,
        recurrence_type:     input.recurrence_type,
        recurrence_end_date: input.recurrence_end_date,
        recurrence_group_id: groupId,
      }));

      const { data, error } = await supabase
        .from("events")
        .insert(rows)
        .select();

      if (error) return { data: null, error: error.message, created_event_ids: [] };
      if (!data || data.length === 0) return { data: null, error: "No events created.", created_event_ids: [] };

      revalidatePath("/events");
      if (input.team_id) revalidatePath(`/teams/${input.team_id}`);
      return {
        data: data[0] as TeamEvent,
        error: null,
        created_event_ids: (data as TeamEvent[]).map((row) => row.id),
      };
    }

    // ── Single event ──────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from("events")
      .insert({ ...base, event_date: input.event_date })
      .select()
      .single();

    if (error) return { data: null, error: error.message, created_event_ids: [] };

    revalidatePath("/events");
    if (input.team_id) revalidatePath(`/teams/${input.team_id}`);
    return { data: data as TeamEvent, error: null, created_event_ids: [data.id] };
  } catch (err) {
    return { data: null, error: String(err), created_event_ids: [] };
  }
}

/**
 * scope "this"  → update only the specified event row.
 * scope "all"   → update every event in the same recurrence_group_id
 *                 (title, type, location, etc. — not the individual dates).
 */
export async function updateEvent(
  input: UpdateEventInput,
  scope: "this" | "all" = "this",
): Promise<{ data: TeamEvent | null; error: string | null }> {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    const patch = {
      team_id:    input.team_id    || null,
      roster_id:  input.roster_id  || null,
      lineup_id:  input.lineup_id  || null,
      type:       input.type,
      title:      input.title.trim(),
      opponent:   input.opponent?.trim()   || null,
      start_time: input.start_time?.trim() || null,
      end_time:   input.end_time?.trim()   || null,
      location:   input.location?.trim()   || null,
      notes:      input.notes?.trim()      || null,
      rsvp_deadline_at: input.rsvp_deadline_at || null,
      is_home:    input.is_home,
    };

    if (scope === "all" && input.recurrence_group_id) {
      const { error } = await supabase
        .from("events")
        .update(patch)
        .eq("recurrence_group_id", input.recurrence_group_id)
        .eq("user_id", user.id);

      if (error) return { data: null, error: error.message };

      // Return the current event's refreshed data
      const { data: refreshed } = await supabase
        .from("events")
        .select()
        .eq("id", input.id)
        .eq("user_id", user.id)
        .single();

      revalidatePath("/events");
      revalidatePath(`/events/${input.id}`);
      if (input.team_id) revalidatePath(`/teams/${input.team_id}`);
      return { data: (refreshed ?? null) as TeamEvent | null, error: null };
    }

    // "this" scope — also update event_date for single edits
    const { data, error } = await supabase
      .from("events")
      .update({ ...patch, event_date: input.event_date })
      .eq("id", input.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/events");
    revalidatePath(`/events/${input.id}`);
    if (input.team_id) revalidatePath(`/teams/${input.team_id}`);
    return { data: data as TeamEvent, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * scope "this"  → delete only this event.
 * scope "all"   → delete all events in the recurrence group.
 */
export async function deleteEvent(
  id: string,
  scope: "this" | "all" = "this",
): Promise<{ error: string | null }> {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    if (scope === "all") {
      const { data: ev } = await supabase
        .from("events")
        .select("recurrence_group_id")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (ev?.recurrence_group_id) {
        const { error } = await supabase
          .from("events")
          .delete()
          .eq("recurrence_group_id", ev.recurrence_group_id)
          .eq("user_id", user.id);
        if (error) return { error: error.message };
        revalidatePath("/events");
        return { error: null };
      }
    }

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { error: error.message };

    revalidatePath("/events");
    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

/**
 * scope "this"  → archive/unarchive only this event.
 * scope "all"   → archive/unarchive all events in the recurrence group.
 */
export async function setEventArchived(
  id: string,
  archived: boolean,
  scope: "this" | "all" = "this",
): Promise<{ error: string | null }> {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    if (scope === "all") {
      const { data: ev } = await supabase
        .from("events")
        .select("recurrence_group_id")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (ev?.recurrence_group_id) {
        const { error } = await supabase
          .from("events")
          .update({ is_archived: archived })
          .eq("recurrence_group_id", ev.recurrence_group_id)
          .eq("user_id", user.id);
        if (error) return { error: error.message };
        revalidatePath("/events");
        revalidatePath(`/events/${id}`);
        return { error: null };
      }
    }

    const { error } = await supabase
      .from("events")
      .update({ is_archived: archived })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { error: error.message };

    revalidatePath("/events");
    revalidatePath(`/events/${id}`);
    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function fetchEvent(id: string): Promise<TeamEvent | null> {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    return (data as TeamEvent) ?? null;
  } catch {
    return null;
  }
}
