"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getUnreadMessageCount } from "@/app/actions/messages";
import { createClient } from "@/utils/supabase/client";

/**
 * Tracks the total unread message count (team chats + DMs) for the current user.
 *
 * - Fetches the server count on mount and whenever the tab regains focus.
 * - Subscribes to Supabase Realtime postgres_changes to increment in real-time.
 *   A unique channel name per effect invocation prevents the "cannot add
 *   callbacks after subscribe()" error that occurs in React Strict Mode.
 */
export function useUnreadMessageCount() {
  const [count,  setCount]  = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const n = await getUnreadMessageCount();
    setCount(n);
  }, []);

  // Load the current user's ID once
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

  // Re-fetch when the tab comes back into focus
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  // Realtime subscription — unique channel name prevents collisions on
  // React Strict Mode double-mount and fast userId changes
  const supabaseRef = useRef(createClient());
  useEffect(() => {
    if (!userId) return;

    // Use a random suffix so each subscription is an independent channel.
    // Supabase throws if you call .on() on an already-subscribed channel name.
    const channelName = `msg-badge-${userId}-${Math.random().toString(36).slice(2)}`;
    const sb = supabaseRef.current;

    const ch = sb
      .channel(channelName)
      .on(
        "postgres_changes" as const,
        {
          event:  "INSERT",
          schema: "public",
          table:  "direct_messages",
          filter: `recipient_id=eq.${userId}`,
        },
        () => { void refresh(); },
      )
      .on(
        "postgres_changes" as const,
        {
          event:  "INSERT",
          schema: "public",
          table:  "team_messages",
        },
        (payload: { new?: { user_id?: string } }) => {
          if (payload.new?.user_id !== userId) void refresh();
        },
      )
      .subscribe();

    return () => {
      void sb.removeChannel(ch);
    };
  }, [userId, refresh]);

  const reset = useCallback(() => setCount(0), []);

  return { count, refresh, reset };
}
