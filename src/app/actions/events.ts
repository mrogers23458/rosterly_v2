"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { CreateEventInput, TeamEvent, UpdateEventInput } from "@/lib/constants/events";

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

export async function createEvent(
  input: CreateEventInput,
): Promise<{ data: TeamEvent | null; error: string | null }> {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id:    user.id,
        team_id:    input.team_id    || null,
        roster_id:  input.roster_id  || null,
        type:       input.type,
        title:      input.title.trim(),
        opponent:   input.opponent?.trim()   || null,
        event_date: input.event_date,
        start_time: input.start_time?.trim() || null,
        end_time:   input.end_time?.trim()   || null,
        location:   input.location?.trim()   || null,
        notes:      input.notes?.trim()      || null,
        is_home:    input.is_home,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/events");
    if (input.team_id) revalidatePath(`/teams/${input.team_id}`);

    return { data: data as TeamEvent, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

export async function updateEvent(
  input: UpdateEventInput,
): Promise<{ data: TeamEvent | null; error: string | null }> {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    const { data, error } = await supabase
      .from("events")
      .update({
        team_id:    input.team_id    || null,
        roster_id:  input.roster_id  || null,
        type:       input.type,
        title:      input.title.trim(),
        opponent:   input.opponent?.trim()   || null,
        event_date: input.event_date,
        start_time: input.start_time?.trim() || null,
        end_time:   input.end_time?.trim()   || null,
        location:   input.location?.trim()   || null,
        notes:      input.notes?.trim()      || null,
        is_home:    input.is_home,
      })
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

export async function deleteEvent(
  id: string,
): Promise<{ error: string | null }> {
  try {
    const { supabase, user } = await getAuthenticatedClient();

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

export async function setEventArchived(
  id: string,
  archived: boolean,
): Promise<{ error: string | null }> {
  try {
    const { supabase, user } = await getAuthenticatedClient();

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
