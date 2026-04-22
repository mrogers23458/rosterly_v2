"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getUnreadMessageCount } from "@/app/actions/messages";
import { createClient } from "@/utils/supabase/client";

/**
 * Tracks the total unread message count (team chats + DMs) for the current user.
 *
 * - Fetches the server-authoritative count on mount and whenever the tab
 *   regains focus (catches messages received while the user was away).
 * - Subscribes to Supabase Realtime `postgres_changes` INSERT events on
 *   `direct_messages` (filtered to this user as recipient) and `team_messages`
 *   (RLS-scoped to the user's teams; own messages are filtered out client-side).
 *   Each new event triggers a re-fetch so the count is always accurate.
 */
export function useUnreadMessageCount() {
  const [count,  setCount]  = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Stable re-fetch that always gets the authoritative count from the server
  const refresh = useCallback(async () => {
    const n = await getUnreadMessageCount();
    setCount(n);
  }, []);

  // Load the user ID once
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Initial count fetch
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Re-fetch whenever the tab comes back into focus
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  // Realtime: subscribe to new messages that affect this user's unread count
  const channelRef = useRef<ReturnType<typeof createClient>["channel"] extends (name: string) => infer R ? R : never | null>(null);
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (supabase as any)
      .channel(`msg-badge-${userId}`)
      // New DMs sent directly to me
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${userId}` },
        () => { void refresh(); },
      )
      // New team messages (RLS scopes to my teams; filter own msgs client-side)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages" },
        (payload: { new?: { user_id?: string } }) => {
          if (payload.new?.user_id !== userId) void refresh();
        },
      )
      .subscribe();

    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, refresh]);

  // Call when the messages flyout is opened or a conversation is selected
  const reset = useCallback(() => setCount(0), []);

  return { count, refresh, reset };
}
