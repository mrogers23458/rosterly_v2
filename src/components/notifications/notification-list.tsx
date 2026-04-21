"use client";

import { Bell, Check, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { markNotificationsRead, deleteNotifications } from "@/app/actions/reminders";
import { Button } from "@/components/ui/button";
import type { AppNotification } from "@/lib/constants/reminders";

type Props = {
  initialNotifications: AppNotification[];
};

function fmtDate(iso: string) {
  const d      = new Date(iso);
  const now    = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH  = diffMs / (1000 * 60 * 60);
  if (diffH < 1)  return `${Math.max(1, Math.round(diffH * 60))} min ago`;
  if (diffH < 24) return `${Math.round(diffH)} hr ago`;
  const diffD  = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: diffD > 365 ? "numeric" : undefined });
}

export function NotificationList({ initialNotifications }: Props) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, start]                = useTransition();
  const [confirmClear, setConfirmClear]   = useState(false);

  const unread = notifications.filter((n) => !n.read_at);

  // ── Optimistic dismiss of a single notification ───────────────────────────
  function handleDismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    start(async () => {
      await deleteNotifications([id]);
    });
  }

  // ── Mark all unread as read ───────────────────────────────────────────────
  function handleMarkAllRead() {
    const ids = unread.map((n) => n.id);
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
    );
    start(async () => {
      await markNotificationsRead(ids);
    });
  }

  // ── Clear all notifications ───────────────────────────────────────────────
  function handleClearAll() {
    setNotifications([]);
    setConfirmClear(false);
    start(async () => {
      await deleteNotifications("all");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      {notifications.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {unread.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}

          {/* Confirm clear flow */}
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Delete all {notifications.length} notification{notifications.length !== 1 ? "s" : ""}?
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearAll}
                disabled={isPending}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Yes, clear all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmClear(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmClear(true)}
              disabled={isPending}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* ── List ──────────────────────────────────────────────────────────── */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Bell className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No notifications.</p>
          <p className="text-xs text-muted-foreground">
            Event reminders and team updates will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`group flex items-start gap-3 px-4 py-3.5 transition-colors ${
                !n.read_at ? "bg-primary/5 hover:bg-primary/8" : "bg-card hover:bg-muted/20"
              }`}
            >
              {/* Unread dot */}
              <div className="mt-[7px] flex h-2 w-2 shrink-0 items-center justify-center">
                {!n.read_at && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>

              {/* Body */}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm leading-snug ${
                    !n.read_at ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                  }`}
                >
                  {n.title}
                </p>
                {n.body && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                )}
              </div>

              {/* Meta + actions */}
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground">{fmtDate(n.created_at)}</span>
                  {/* Dismiss button — visible on hover */}
                  <button
                    type="button"
                    onClick={() => handleDismiss(n.id)}
                    title="Dismiss"
                    className="ml-1 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {n.link && (
                  <Link
                    href={n.link}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
