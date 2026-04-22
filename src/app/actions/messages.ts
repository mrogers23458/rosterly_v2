"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendPushToUsers } from "@/lib/push";

export type TeamMessage = {
  id:          string;
  team_id:     string;
  user_id:     string;
  sender_name: string;
  body:        string;
  created_at:  string;
};

type Ok<T> = { data: T; error?: never };
type Err   = { error: string; data?: never };

async function getClient() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

// ─── Load ─────────────────────────────────────────────────────────────────────

export async function getTeamMessages(
  teamId: string,
): Promise<{ data?: TeamMessage[]; error?: string }> {
  const { supabase, user } = await getClient();
  if (!user) return { error: "You must be signed in." };

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return { error: "You are not a member of this team." };

  const { data: msgRows, error } = await supabase
    .from("team_messages")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return { error: error.message };
  return { data: (msgRows ?? []) as TeamMessage[] };
}

// ─── Send ─────────────────────────────────────────────────────────────────────

export async function sendTeamMessage(
  teamId: string,
  body: string,
): Promise<Ok<TeamMessage> | Err> {
  const { supabase, user } = await getClient();
  if (!user) return { error: "You must be signed in." };

  const trimmed = body.trim();
  if (!trimmed)              return { error: "Message cannot be empty." };
  if (trimmed.length > 2000) return { error: "Message is too long (max 2000 characters)." };

  const senderName: string =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name     as string | undefined) ??
    user.email?.split("@")[0] ??
    "Unknown";

  const { data, error } = await supabase
    .from("team_messages")
    .insert({ team_id: teamId, user_id: user.id, sender_name: senderName, body: trimmed })
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not send message." };

  revalidatePath(`/teams/${teamId}/chat`);

  // Fire push to team members — non-blocking, failures are swallowed
  void (async () => {
    try {
      const admin = createAdminClient();
      const [{ data: members }, { data: team }] = await Promise.all([
        admin
          .from("team_members")
          .select("user_id")
          .eq("team_id", teamId)
          .neq("user_id", user.id),
        admin.from("teams").select("name").eq("id", teamId).single(),
      ]);
      const recipientIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
      if (recipientIds.length > 0) {
        await sendPushToUsers(recipientIds, {
          title: `New message in ${(team as { name?: string } | null)?.name ?? "Team"}`,
          body:  `${senderName}: ${trimmed.slice(0, 100)}`,
          url:   "/?openMessages=1",
        });
      }
    } catch {
      // Push failures must never fail the message send
    }
  })();

  return { data: data as TeamMessage };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTeamMessage(
  messageId: string,
  teamId: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await getClient();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("team_messages")
    .delete()
    .eq("id", messageId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/teams/${teamId}/chat`);
  return {};
}

// ─── Unread count ─────────────────────────────────────────────────────────────

export async function getUnreadMessageCount(): Promise<number> {
  const { supabase, user } = await getClient();
  if (!user) return 0;
  const { data, error } = await supabase.rpc("get_unread_message_count", { p_user_id: user.id });
  return error ? 0 : ((data as number) ?? 0);
}

// ─── Mark conversation read ───────────────────────────────────────────────────

export async function markConversationRead(
  type: "team" | "direct",
  conversationId: string,
): Promise<void> {
  const { supabase, user } = await getClient();
  if (!user) return;
  await supabase.from("message_reads").upsert(
    {
      user_id:           user.id,
      conversation_type: type,
      conversation_id:   conversationId,
      last_read_at:      new Date().toISOString(),
    },
    { onConflict: "user_id,conversation_type,conversation_id" },
  );
}
