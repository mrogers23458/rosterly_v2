"use client";

import { Bell, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { markNotificationsRead } from "@/app/actions/reminders";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/client";
import type { AppNotification } from "@/lib/constants/reminders";

function fmtDate(iso: string) {
  const d      = new Date(iso);
  const now    = new Date();
  const diffH  = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
  if (diffH < 1)  return `${Math.max(1, Math.round(diffH * 60))}m ago`;
  if (diffH < 24) return `${Math.round(diffH)}h ago`;
  const diffD  = Math.floor(diffH / 24);
  if (diffD < 7)  return `${diffD}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationsWidget() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [isPending, start]                = useTransition();

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);

      setNotifications((data ?? []) as AppNotification[]);
      setLoading(false);
    })();
  }, []);

  const unread = notifications.filter((n) => !n.read_at);

  function handleMarkAllRead() {
    const ids = unread.map((n) => n.id);
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
    );
    start(async () => {
      await markNotificationsRead(ids);
    });
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-border bg-card">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>

        {/* Rows */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 border-b border-border px-4 py-3">
            <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5" style={{ width: `${65 + (i % 3) * 12}%` }} />
              <Skeleton className="h-3" style={{ width: `${45 + (i % 4) * 8}%` }} />
            </div>
            <Skeleton className="h-3 w-10 shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (notifications.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-border bg-card">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Notifications</h2>
          </div>
          <Link href="/notifications" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            View all →
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <Bell className="h-8 w-8 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">All caught up!</p>
          <p className="text-xs text-muted-foreground">No notifications yet.</p>
        </div>
      </div>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Notifications</h2>
          {unread.length > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white">
              {unread.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {unread.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={isPending}
              title="Mark all read"
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mark read</span>
            </button>
          )}
          <Link
            href="/notifications"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View all →
          </Link>
        </div>
      </div>

      {/* Notification rows */}
      <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/20 ${
              !n.read_at ? "bg-primary/5" : "bg-card"
            }`}
          >
            {/* Unread dot */}
            <div className="mt-[7px] h-2 w-2 shrink-0">
              {!n.read_at && <span className="block h-2 w-2 rounded-full bg-primary" />}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`text-xs leading-snug ${
                  !n.read_at ? "font-semibold text-foreground" : "font-medium text-foreground/75"
                }`}
              >
                {n.title}
              </p>
              {n.body && (
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{n.body}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[10px] text-muted-foreground">{fmtDate(n.created_at)}</span>
              {n.link && (
                <Link href={n.link} className="text-[10px] font-medium text-primary hover:underline">
                  View →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
