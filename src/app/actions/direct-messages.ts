"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUserTeamRole } from "@/lib/permissions";
import { sendPushToUsers } from "@/lib/push";

export type DirectMessage = {
  id:           string;
  sender_id:    string;
  recipient_id: string;
  sender_name:  string;
  body:         string;
  created_at:   string;
};

export type DirectChatPeer = {
  userId:      string;
  displayName: string;
};

export type TeamChatRow = { id: string; name: string };

type Ok<T> = { data: T; error?: never };
type Err   = { error: string; data?: never };

async function getClient() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

function labelFromEmail(email: string) {
  const local = email.split("@")[0]?.trim();
  return local || email || "Member";
}

// ─── Sidebar: teams ───────────────────────────────────────────────────────────

export async function getTeamsForChat(): Promise<Ok<TeamChatRow[]> | Err> {
  const { supabase, user } = await getClient();
  if (!user) return { error: "You must be signed in." };

  const { data: memberships, error: mErr } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  if (mErr) return { error: "Could not load teams." };

  const teamIds = [...new Set((memberships ?? []).map((r: { team_id: string }) => r.team_id))];
  if (teamIds.length === 0) return { data: [] };

  const { data: teams, error: tErr } = await supabase
    .from("teams")
    .select("id, name")
    .in("id", teamIds)
    .order("name", { ascending: true });

  if (tErr) return { error: "Could not load teams." };
  return { data: (teams ?? []) as TeamChatRow[] };
}

// ─── Sidebar: direct chat peers (share ≥1 team) ─────────────────────────────

export async function getDirectChatPeers(): Promise<Ok<DirectChatPeer[]> | Err> {
  const { supabase, user } = await getClient();
  if (!user) return { error: "You must be signed in." };

  const { data: memberships, error: mErr } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  if (mErr) return { error: "Could not load teammates." };

  const teamIds = [...new Set((memberships ?? []).map((r: { team_id: string }) => r.team_id))];
  if (teamIds.length === 0) return { data: [] };

  const { data: peerRows, error: pErr } = await supabase
    .from("team_members")
    .select("user_id")
    .in("team_id", teamIds);

  if (pErr) return { error: "Could not load teammates." };

  const peerIds = new Set<string>();
  for (const row of peerRows ?? []) {
    const uid = (row as { user_id: string }).user_id;
    if (uid && uid !== user.id) peerIds.add(uid);
  }

  const ids = [...peerIds];
  if (ids.length === 0) return { data: [] };

  const { data: emailRows } = await supabase.rpc("get_team_member_emails", {
    p_user_ids: ids,
  });

  const emailMap: Record<string, string> = {};
  for (const row of emailRows ?? []) {
    emailMap[(row as { user_id: string }).user_id] = (row as { email: string }).email ?? "";
  }

  const peers: DirectChatPeer[] = ids.map((userId) => ({
    userId,
    displayName: labelFromEmail(emailMap[userId] ?? "") || "Member",
  }));

  peers.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
  return { data: peers };
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getDirectMessages(
  peerUserId: string,
): Promise<Ok<DirectMessage[]> | Err> {
  const { supabase, user } = await getClient();
  if (!user) return { error: "You must be signed in." };
  if (peerUserId === user.id) return { error: "Invalid peer." };

  const { data: peerTeams } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", peerUserId);

  const peerTeamIds = new Set((peerTeams ?? []).map((r: { team_id: string }) => r.team_id));
  if (peerTeamIds.size === 0) return { data: [] };

  const { data: myTeams } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  const myTeamIds = new Set((myTeams ?? []).map((r: { team_id: string }) => r.team_id));
  let shared = false;
  for (const tid of peerTeamIds) {
    if (myTeamIds.has(tid)) {
      shared = true;
      break;
    }
  }
  if (!shared) return { error: "You can only message teammates." };

  const [{ data: outRows, error: e1 }, { data: inRows, error: e2 }] = await Promise.all([
    supabase
      .from("direct_messages")
      .select("*")
      .eq("sender_id", user.id)
      .eq("recipient_id", peerUserId)
      .order("created_at", { ascending: true })
      .limit(200),
    supabase
      .from("direct_messages")
      .select("*")
      .eq("sender_id", peerUserId)
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: true })
      .limit(200),
  ]);

  if (e1) return { error: e1.message };
  if (e2) return { error: e2.message };

  const merged = [...(outRows ?? []), ...(inRows ?? [])] as DirectMessage[];
  merged.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  if (merged.length > 200) merged.splice(0, merged.length - 200);

  return { data: merged };
}

export async function sendDirectMessage(
  peerUserId: string,
  body: string,
): Promise<Ok<DirectMessage> | Err> {
  const { supabase, user } = await getClient();
  if (!user) return { error: "You must be signed in." };
  if (peerUserId === user.id) return { error: "Invalid peer." };

  const trimmed = body.trim();
  if (!trimmed) return { error: "Message cannot be empty." };
  if (trimmed.length > 2000) return { error: "Message is too long (max 2000 characters)." };

  const { data: myT } = await supabase.from("team_members").select("team_id").eq("user_id", user.id);
  const { data: peerT } = await supabase.from("team_members").select("team_id").eq("user_id", peerUserId);
  const mySet = new Set((myT ?? []).map((r: { team_id: string }) => r.team_id));
  const shared = (peerT ?? []).some((r: { team_id: string }) => mySet.has(r.team_id));
  if (!shared) return { error: "You can only message teammates." };

  const senderName: string =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Unknown";

  const { data, error } = await supabase
    .from("direct_messages")
    .insert({
      sender_id:    user.id,
      recipient_id: peerUserId,
      sender_name:  senderName,
      body:         trimmed,
    })
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not send message." };

  // Fire push to recipient — non-blocking, failures are swallowed
  void sendPushToUsers([peerUserId], {
    title: `New message from ${senderName}`,
    body:  trimmed.slice(0, 100),
    url:   "/?openMessages=1",
  }).catch(() => {});

  return { data: data as DirectMessage };
}

export async function deleteDirectMessage(messageId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getClient();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("direct_messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) return { error: error.message };
  return {};
}

// ─── Team name for deep link ─────────────────────────────────────────────────

export async function getTeamNameForChat(
  teamId: string,
): Promise<{ name?: string; error?: string }> {
  const { supabase, user } = await getClient();
  if (!user) return { error: "Unauthorized" };

  const role = await getUserTeamRole(supabase, user.id, teamId);
  if (!role) return { error: "Not a member" };

  const { data, error } = await supabase.from("teams").select("name").eq("id", teamId).single();
  if (error || !data) return { error: "Not found" };
  return { name: (data as { name: string }).name };
}
