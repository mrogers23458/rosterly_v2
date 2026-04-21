"use client";

import { Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  deleteDirectMessage,
  sendDirectMessage,
  type DirectMessage,
} from "@/app/actions/direct-messages";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import type { RealtimeChannel } from "@supabase/supabase-js";

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isToday) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

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

function MessageBubble({
  msg,
  isOwn,
  showHeader,
  canDelete,
  onDelete,
  deleting,
}: {
  msg:        DirectMessage;
  isOwn:      boolean;
  showHeader: boolean;
  canDelete:  boolean;
  onDelete:   () => void;
  deleting:   boolean;
}) {
  return (
    <div className={cn("group flex items-end gap-2", isOwn && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          avatarColor(msg.sender_name),
          !showHeader && "invisible",
        )}
      >
        {getInitials(msg.sender_name)}
      </div>

      <div className={cn("flex max-w-[72%] flex-col gap-0.5", isOwn && "items-end")}>
        {showHeader && (
          <span className={cn("text-[11px] font-medium text-muted-foreground", isOwn && "mr-1")}>
            {isOwn ? "You" : msg.sender_name}
          </span>
        )}

        <div className="flex items-end gap-1.5">
          {canDelete && (
            <button
              type="button"
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

function DateDivider({ ts }: { ts: string }) {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

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

function channelIdForPair(a: string, b: string) {
  return `direct-chat-${[a, b].sort().join("-")}`;
}

type Props = {
  peerUserId:       string;
  peerDisplayName:  string;
  currentUserId:    string;
  initialMessages:  DirectMessage[];
};

export function DirectChat({
  peerUserId,
  peerDisplayName,
  currentUserId,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<DirectMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const bottomRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [peerUserId, initialMessages]);

  useEffect(() => {
    const supabase = createClient();
    const chName = channelIdForPair(currentUserId, peerUserId);

    const channel = supabase
      .channel(chName)
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const msg = payload.msg as DirectMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      })
      .on("broadcast", { event: "delete" }, ({ payload }) => {
        setMessages((prev) => prev.filter((m) => m.id !== (payload as { id: string }).id));
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [peerUserId, currentUserId]);

  useEffect(() => {
    if (isFirstRender.current) {
      bottomRef.current?.scrollIntoView();
      isFirstRender.current = false;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function handleSend() {
    const body = input.trim();
    if (!body || isPending) return;

    setSendError(null);
    setInput("");

    const optimistic: DirectMessage = {
      id:            `optimistic-${Date.now()}`,
      sender_id:     currentUserId,
      recipient_id:  peerUserId,
      sender_name:   "You",
      body,
      created_at:    new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    startTransition(async () => {
      const res = await sendDirectMessage(peerUserId, body);
      if (res.error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setSendError(res.error);
        setInput(body);
      } else {
        const saved = res.data as DirectMessage;
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
        channelRef.current?.send({
          type:    "broadcast",
          event:   "message",
          payload: { msg: res.data },
        });
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleDelete(messageId: string) {
    setDeletingId(messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    startTransition(async () => {
      const res = await deleteDirectMessage(messageId);
      setDeletingId(null);
      if (res.error) {
        setSendError(res.error);
      } else {
        channelRef.current?.send({
          type:    "broadcast",
          event:   "delete",
          payload: { id: messageId },
        });
      }
    });
  }

  const rendered: React.ReactNode[] = [];
  let lastDateKey = "";

  messages.forEach((msg, i) => {
    const d = new Date(msg.created_at);
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dateKey !== lastDateKey) {
      rendered.push(<DateDivider key={`date-${dateKey}`} ts={msg.created_at} />);
      lastDateKey = dateKey;
    }

    const prev = messages[i - 1];
    const showHeader =
      !prev ||
      prev.sender_id !== msg.sender_id ||
      new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;

    rendered.push(
      <MessageBubble
        key={msg.id}
        msg={msg}
        isOwn={msg.sender_id === currentUserId}
        showHeader={showHeader}
        canDelete={msg.sender_id === currentUserId}
        onDelete={() => handleDelete(msg.id)}
        deleting={deletingId === msg.id}
      />,
    );
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-xs font-medium text-muted-foreground">Direct message</p>
        <p className="truncate text-sm font-semibold">{peerDisplayName}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <div className="text-3xl">👋</div>
            <p className="text-sm font-medium">No messages yet</p>
            <p className="max-w-[240px] text-xs">Say hi to {peerDisplayName}.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">{rendered}</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border bg-background px-4 py-3">
        {sendError && <p className="mb-2 text-xs text-destructive">{sendError}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${peerDisplayName}…`}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            style={{ maxHeight: "120px", overflowY: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <Button
            type="button"
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
