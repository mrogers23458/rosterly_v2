"use client";

import { ExternalLink, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import type { DirectMessage } from "@/app/actions/direct-messages";
import {
  getDirectChatPeers,
  getDirectMessages,
  getTeamsForChat,
  type DirectChatPeer,
  type TeamChatRow,
} from "@/app/actions/direct-messages";
import type { TeamMessage } from "@/app/actions/messages";
import { getTeamMessages } from "@/app/actions/messages";
import { DirectChat } from "@/components/chat/direct-chat";
import { TeamChat } from "@/components/chat/team-chat";
import { useChatFlyout } from "@/components/chat/chat-flyout-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "team" | "direct";

export function QuickChatWidget() {
  const { openTeamChat, openDirectChat, setOpen: setFlyoutOpen } = useChatFlyout();
  const [userId, setUserId] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamChatRow[]>([]);
  const [peers, setPeers] = useState<DirectChatPeer[]>([]);
  const [mode, setMode] = useState<Mode>("team");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const [tRes, pRes] = await Promise.all([getTeamsForChat(), getDirectChatPeers()]);
      if (cancelled) return;
      if ("data" in tRes) {
        const list = tRes.data ?? [];
        setTeams(list);
        if (list.length > 0) setTeamId((prev) => prev ?? list[0].id);
      }
      if ("data" in pRes) {
        const list = pRes.data ?? [];
        setPeers(list);
        if (list.length > 0) setPeerId((prev) => prev ?? list[0].userId);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!teamId || mode !== "team") return;
    let cancelled = false;
    void getTeamMessages(teamId).then((res) => {
      if (!cancelled && res.data) setTeamMessages(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [teamId, mode]);

  useEffect(() => {
    if (!peerId || mode !== "direct") return;
    let cancelled = false;
    void getDirectMessages(peerId).then((res) => {
      if (!cancelled && res.data) setDmMessages(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [peerId, mode]);

  function openInFlyout() {
    if (mode === "team" && teamId) {
      const t = teams.find((x) => x.id === teamId);
      openTeamChat(teamId, t?.name ?? "Team");
    } else if (mode === "direct" && peerId) {
      const p = peers.find((x) => x.userId === peerId);
      openDirectChat(peerId, p?.displayName ?? "Member");
    }
    setFlyoutOpen(true);
  }

  if (!userId || loading) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-border bg-card" style={{ height: "100%" }}>
        {/* Header skeleton */}
        <div className="shrink-0 border-b border-border px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-7 w-28 rounded-md" />
          </div>
          {/* Mode tabs */}
          <div className="mt-2 flex gap-1">
            <Skeleton className="h-7 flex-1 rounded-md" />
            <Skeleton className="h-7 flex-1 rounded-md" />
          </div>
          {/* Dropdown */}
          <Skeleton className="mt-2 h-7 w-full rounded-md" />
        </div>

        {/* Message bubbles skeleton */}
        <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3 py-3">
          <Skeleton className="h-8 w-2/3 self-start rounded-2xl rounded-tl-sm" />
          <Skeleton className="h-8 w-1/2 self-end rounded-2xl rounded-tr-sm" />
          <Skeleton className="h-10 w-3/4 self-start rounded-2xl rounded-tl-sm" />
          <Skeleton className="h-8 w-2/5 self-end rounded-2xl rounded-tr-sm" />
          <Skeleton className="h-8 w-3/5 self-start rounded-2xl rounded-tl-sm" />
        </div>

        {/* Input skeleton */}
        <div className="shrink-0 border-t border-border px-3 py-2">
          <Skeleton className="h-8 w-full rounded-full" />
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div
        className="flex h-full flex-col justify-center rounded-lg border border-border bg-card px-4 py-6"
        style={{ height: "100%" }}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            Join or create a team to use quick chat
          </p>
        </div>
      </div>
    );
  }

  const peerLabel = peers.find((p) => p.userId === peerId)?.displayName ?? "Member";

  return (
    <div
      className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card"
      style={{ height: "100%" }}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-border px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Quick chat</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground"
            onClick={openInFlyout}
          >
            <ExternalLink className="h-3 w-3" />
            Full messages
          </Button>
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode("team")}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              mode === "team" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            Team
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("direct");
              if (!peerId && peers[0]) setPeerId(peers[0].userId);
            }}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              mode === "direct" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            Direct
          </button>
        </div>

        {mode === "team" && (
          <>
            <label className="sr-only" htmlFor="quick-chat-team">
              Team
            </label>
            <select
              id="quick-chat-team"
              value={teamId ?? ""}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-2 pr-9 py-1.5 text-xs"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </>
        )}

        {mode === "direct" &&
          (peers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No teammates available for direct messages.</p>
          ) : (
            <>
              <label className="sr-only" htmlFor="quick-chat-peer">
                Teammate
              </label>
              <select
                id="quick-chat-peer"
                value={peerId ?? ""}
                onChange={(e) => setPeerId(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-2 pr-9 py-1.5 text-xs"
              >
                {peers.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </>
          ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {mode === "team" && teamId && (
          <div className="flex min-h-0 flex-1 flex-col">
            <TeamChat
              key={teamId}
              teamId={teamId}
              currentUserId={userId}
              initialMessages={teamMessages}
            />
          </div>
        )}
        {mode === "direct" && peerId && peers.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col">
            <DirectChat
              key={peerId}
              peerUserId={peerId}
              peerDisplayName={peerLabel}
              currentUserId={userId}
              initialMessages={dmMessages}
            />
          </div>
        )}
      </div>
    </div>
  );
}
