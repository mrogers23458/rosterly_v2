"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export type UserProfile = {
  user_id:    string;
  first_name: string | null;
  last_name:  string | null;
  phone:      string | null;
  address:    string | null;
  avatar_url: string | null;
  email:      string | null;
};

export async function getProfile(): Promise<{ data: UserProfile | null; error: string | null }> {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return {
    data: {
      user_id:    user.id,
      first_name: data?.first_name ?? null,
      last_name:  data?.last_name  ?? null,
      phone:      data?.phone      ?? null,
      address:    data?.address    ?? null,
      avatar_url: data?.avatar_url ?? null,
      email:      user.email       ?? null,
    },
    error: null,
  };
}

export async function upsertProfile(input: {
  firstName:  string;
  lastName:   string;
  phone:      string;
  address:    string;
  avatarUrl?: string;
}): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const now = new Date().toISOString();
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id:    user.id,
      first_name: input.firstName.trim() || null,
      last_name:  input.lastName.trim()  || null,
      phone:      input.phone.trim()     || null,
      address:    input.address.trim()   || null,
      ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };
  return { error: null };
}

export async function updateEmail(
  newEmail: string,
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!newEmail.trim()) return { error: "Email is required" };
  if (newEmail.trim().toLowerCase() === user.email?.toLowerCase()) {
    return { error: null };
  }

  // Use admin client so we can update auth.users without re-auth prompts.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: newEmail.trim().toLowerCase(),
  });

  if (error) return { error: error.message };
  return { error: null };
}
