"use client";

import { Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteTeamMessage, sendTeamMessage, type TeamMessage } from "@/app/actions/messages";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth()    === now.getMonth()    &&
    d.getDate()     === now.getDate();

  if (isToday) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Deterministic pastel color from name
const AVATAR_COLORS = [
  "bg-blue-200 text-blue-800",
  "bg-green-200 text-green-800",
  "bg-purple-200 text-purple-800",
  "bg-orange-200 text-orange-800",
  "bg-pink-200 text-pink-800",
  "bg-teal-200 text-teal-800",
  "bg-yellow-200 text-yellow-800",
  "bg-red-200 text-red-800",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isOwn,
  showHeader,
  canDelete,
  onDelete,
  deleting,
}: {
  msg:        TeamMessage;
  isOwn:      boolean;
  showHeader: boolean;
  canDelete:  boolean;
  onDelete:   () => void;
  deleting:   boolean;
}) {
  return (
    <div className={cn("group flex items-end gap-2", isOwn && "flex-row-reverse")}>
      {/* Avatar — only shown on the first message of a run */}
      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", avatarColor(msg.sender_name), !showHeader && "invisible")}>
        {getInitials(msg.sender_name)}
      </div>

      <div className={cn("flex max-w-[72%] flex-col gap-0.5", isOwn && "items-end")}>
        {showHeader && (
          <span className={cn("text-[11px] font-medium text-muted-foreground", isOwn && "mr-1")}>
            {isOwn ? "You" : msg.sender_name}
          </span>
        )}

        <div className="flex items-end gap-1.5">
          {/* Delete button — appears on hover, own side only */}
          {canDelete && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className={cn(
                "invisible mb-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:visible group-hover:opacity-100",
                isOwn ? "order-first" : "order-last",
              )}
              title="Delete message"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}

          <div
            className={cn(
              "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-xs",
              isOwn
                ? "rounded-br-sm bg-primary text-primary-foreground"
                : "rounded-bl-sm bg-muted text-foreground",
            )}
          >
            {msg.body}
          </div>
        </div>

        {showHeader && (
          <span className={cn("text-[10px] text-muted-foreground/60", isOwn && "mr-1")}>
            {formatTime(msg.created_at)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Date divider ─────────────────────────────────────────────────────────────

function DateDivider({ ts }: { ts: string }) {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth()    === now.getMonth()    &&
    d.getDate()     === now.getDate();

  const label = isToday
    ? "Today"
    : d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  teamId:          string;
  currentUserId:   string;
  initialMessages: TeamMessage[];
};

export function TeamChat({ teamId, currentUserId, initialMessages }: Props) {
  const [messages,   setMessages]   = useState<TeamMessage[]>(initialMessages);
  const [input,      setInput]      = useState("");
  const [sendError,  setSendError]  = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending,  startTransition] = useTransition();

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const isFirstRender = useRef(true);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`team-chat-${teamId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "team_messages",
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          const msg = payload.new as TeamMessage;
          // Avoid duplicating optimistic messages sent by the current user
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event:  "DELETE",
          schema: "public",
          table:  "team_messages",
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [teamId]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isFirstRender.current) {
      // On first render, jump immediately (no animation)
      bottomRef.current?.scrollIntoView();
      isFirstRender.current = false;
    } else {
      // For new messages, smooth scroll
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ── Send ───────────────────────────────────────────────────────────────────
  function handleSend() {
    const body = input.trim();
    if (!body || isPending) return;

    setSendError(null);
    setInput("");

    // Optimistic message (no id yet — realtime will add the real one)
    const optimistic: TeamMessage = {
      id:          `optimistic-${Date.now()}`,
      team_id:     teamId,
      user_id:     currentUserId,
      sender_name: "You",
      body,
      created_at:  new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    startTransition(async () => {
      const res = await sendTeamMessage(teamId, body);
      if (res.error) {
        // Roll back optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setSendError(res.error);
        setInput(body); // restore draft
      }
      // On success, realtime subscription will add the real message.
      // Remove the optimistic one once a real message with matching body arrives.
      else {
        setMessages((prev) =>
          prev.map((m) => m.id === optimistic.id ? res.data : m),
        );
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  function handleDelete(messageId: string) {
    setDeletingId(messageId);
    // Optimistic removal
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    startTransition(async () => {
      const res = await deleteTeamMessage(messageId, teamId);
      setDeletingId(null);
      if (res.error) {
        // Re-fetch isn't trivial here, just show error
        setSendError(res.error);
      }
    });
  }

  // ── Render messages with date dividers and run grouping ────────────────────
  const rendered: React.ReactNode[] = [];
  let lastDateKey = "";

  messages.forEach((msg, i) => {
    const d = new Date(msg.created_at);
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dateKey !== lastDateKey) {
      rendered.push(<DateDivider key={`date-${dateKey}`} ts={msg.created_at} />);
      lastDateKey = dateKey;
    }

    // Show header (avatar + name + timestamp) if first in a run from this sender
    const prev = messages[i - 1];
    const showHeader =
      !prev ||
      prev.user_id !== msg.user_id ||
      new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;

    rendered.push(
      <MessageBubble
        key={msg.id}
        msg={msg}
        isOwn={msg.user_id === currentUserId}
        showHeader={showHeader}
        canDelete={msg.user_id === currentUserId}
        onDelete={() => handleDelete(msg.id)}
        deleting={deletingId === msg.id}
      />,
    );
  });

  return (
    <div className="flex h-full flex-col">
      {/* ── Message list ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <div className="text-4xl">💬</div>
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs">Be the first to say something to the team!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {rendered}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Composer ─────────────────────────────────────────────────── */}
      <div className="border-t border-border bg-background px-4 py-3">
        {sendError && (
          <p className="mb-2 text-xs text-destructive">{sendError}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the team… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            style={{ maxHeight: "120px", overflowY: "auto" }}
            onInput={(e) => {
              // Auto-grow
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isPending}
            className="h-9 w-9 shrink-0"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground/60">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}
