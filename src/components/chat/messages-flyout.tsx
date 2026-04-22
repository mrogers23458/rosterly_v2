"use client";

import { MessageSquare, PanelRightClose, User, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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

// ── Skeleton: sidebar list items ──────────────────────────────────────────────
function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-0.5 px-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 rounded-md px-2 py-2">
          <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
          <Skeleton className="h-3.5" style={{ width: `${50 + i * 20}%` }} />
        </div>
      ))}
    </div>
  );
}

// ── Skeleton: message bubble area ─────────────────────────────────────────────
function MessagesSkeleton() {
  const bubbles = [
    { own: false, w: "55%"  },
    { own: true,  w: "45%"  },
    { own: false, w: "65%"  },
    { own: false, w: "40%"  },
    { own: true,  w: "50%"  },
    { own: true,  w: "35%"  },
    { own: false, w: "60%"  },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Bubble area */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 py-4">
        {bubbles.map((b, i) => (
          <div
            key={i}
            className={cn(
              "flex items-end gap-2",
              b.own && "flex-row-reverse",
            )}
          >
            {/* Avatar */}
            {!b.own && <Skeleton className="h-7 w-7 shrink-0 rounded-full" />}
            <div
              className={cn("flex flex-col gap-1", b.own && "items-end")}
              style={{ maxWidth: "72%" }}
            >
              {/* Sender name on first in run */}
              {i === 0 || bubbles[i - 1].own !== b.own ? (
                <Skeleton className="h-3 w-16" />
              ) : null}
              <Skeleton
                className="h-9 rounded-2xl"
                style={{
                  width: b.w,
                  borderRadius: b.own ? "1rem 1rem 2px 1rem" : "1rem 1rem 1rem 2px",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Input bar skeleton */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <div className="flex items-end gap-2">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function MessagesFlyout() {
  const { open, setOpen, selection, clearSelection, openTeamChat, openDirectChat } =
    useChatFlyout();
  const [userId, setUserId]           = useState<string | null>(null);
  const [teams,  setTeams]            = useState<TeamChatRow[]>([]);
  const [peers,  setPeers]            = useState<DirectChatPeer[]>([]);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const [dmMessages,   setDmMessages]   = useState<DirectMessage[]>([]);
  const [loadError,    setLoadError]    = useState<string | null>(null);

  // Separate loading flags so we can show targeted skeletons
  const [sidebarLoading,  setSidebarLoading]  = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [, startTransition] = useTransition();

  // Track what selection we most recently kicked off a load for
  const loadingSelectionRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const loadSidebar = useCallback(() => {
    setSidebarLoading(true);
    startTransition(async () => {
      const [tRes, pRes] = await Promise.all([getTeamsForChat(), getDirectChatPeers()]);
      setSidebarLoading(false);
      if ("error" in tRes) { setLoadError(tRes.error ?? "Could not load teams."); return; }
      if ("error" in pRes) { setLoadError(pRes.error ?? "Could not load teammates."); return; }
      setLoadError(null);
      setTeams(tRes.data);
      setPeers(pRes.data);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    loadSidebar();
  }, [open, loadSidebar]);

  useEffect(() => {
    if (!open || !selection || !userId) return;

    const key = selection.kind === "team" ? selection.teamId : selection.userId;
    loadingSelectionRef.current = key;
    setMessagesLoading(true);

    startTransition(async () => {
      if (selection.kind === "team") {
        const res = await getTeamMessages(selection.teamId);
        // Only apply if the selection hasn't changed while we were loading
        if (loadingSelectionRef.current !== selection.teamId) return;
        setMessagesLoading(false);
        if (res.error) setLoadError(res.error);
        else { setLoadError(null); setTeamMessages(res.data ?? []); }
      } else {
        const res = await getDirectMessages(selection.userId);
        if (loadingSelectionRef.current !== selection.userId) return;
        setMessagesLoading(false);
        if (res.error) setLoadError(res.error);
        else { setLoadError(null); setDmMessages(res.data ?? []); }
      }
    });
  }, [open, selection, userId]);

  function handleClose() {
    setOpen(false);
    clearSelection();
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[42] bg-black/30 transition-opacity md:left-[var(--sidebar-w)]",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
        onClick={handleClose}
      />

      <aside
        className={cn(
          "fixed z-[43] flex flex-col border-l border-border bg-white shadow-xl transition-transform duration-200 ease-out",
          "right-0 top-14 h-[calc(100dvh-3.5rem)] w-full sm:max-w-full",
          "md:top-0 md:h-screen md:w-[min(720px,calc(100vw-var(--sidebar-w)))]",
          open ? "translate-x-0" : "translate-x-full pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3 md:h-14 md:px-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Messages</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleClose}
            aria-label="Close messages"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* ── Sidebar (team + peer list) ──────────────────────────────── */}
          <div className="flex max-h-[40vh] w-full shrink-0 flex-col border-b border-border bg-muted/20 md:max-h-none md:w-[220px] md:border-b-0 md:border-r">
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Team chats
              </p>
              <div className="mb-4 flex flex-col gap-0.5">
                {sidebarLoading ? (
                  <SidebarSkeleton />
                ) : teams.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-muted-foreground">No teams yet.</p>
                ) : (
                  teams.map((t) => {
                    const active = selection?.kind === "team" && selection.teamId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => openTeamChat(t.id, t.name)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                          active
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-foreground/80 hover:bg-muted",
                        )}
                      >
                        <Users className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{t.name}</span>
                      </button>
                    );
                  })
                )}
              </div>

              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Direct chats
              </p>
              <div className="flex flex-col gap-0.5">
                {sidebarLoading ? (
                  <SidebarSkeleton />
                ) : peers.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    No teammates yet for direct messages.
                  </p>
                ) : (
                  peers.map((p) => {
                    const active = selection?.kind === "direct" && selection.userId === p.userId;
                    return (
                      <button
                        key={p.userId}
                        type="button"
                        onClick={() => openDirectChat(p.userId, p.displayName)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                          active
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-foreground/80 hover:bg-muted",
                        )}
                      >
                        <User className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{p.displayName}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Main chat area ───────────────────────────────────────────── */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
            {loadError && (
              <p className="border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive">
                {loadError}
              </p>
            )}

            {/* No conversation selected */}
            {!selection && !messagesLoading && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 opacity-40" />
                <p className="text-sm font-medium text-foreground/70">Select a conversation</p>
                <p className="max-w-xs text-xs">
                  Choose a team or teammate on the left to read and send messages.
                </p>
              </div>
            )}

            {/* Loading skeleton — shown while messages are being fetched */}
            {messagesLoading && selection && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 border-b border-border px-4 py-2.5">
                  <Skeleton className="mb-1 h-3 w-16" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="min-h-0 flex-1">
                  <MessagesSkeleton />
                </div>
              </div>
            )}

            {/* Team chat */}
            {!messagesLoading && selection && userId && selection.kind === "team" && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 border-b border-border px-4 py-2.5">
                  <p className="text-xs font-medium text-muted-foreground">Team chat</p>
                  <p className="truncate text-sm font-semibold">{selection.title}</p>
                </div>
                <div className="min-h-0 flex-1">
                  <TeamChat
                    key={selection.teamId}
                    teamId={selection.teamId}
                    currentUserId={userId}
                    initialMessages={teamMessages}
                  />
                </div>
              </div>
            )}

            {/* Direct chat */}
            {!messagesLoading && selection && userId && selection.kind === "direct" && (
              <div className="min-h-0 flex-1">
                <DirectChat
                  key={selection.userId}
                  peerUserId={selection.userId}
                  peerDisplayName={selection.displayName}
                  currentUserId={userId}
                  initialMessages={dmMessages}
                />
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
