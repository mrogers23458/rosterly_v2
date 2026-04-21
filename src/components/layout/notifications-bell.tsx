"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

function useUnreadCount() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .then(({ count }) => setUnread(count ?? 0));
  }, [pathname]);

  return unread;
}

/** Small bell icon used in the mobile top-bar. */
export function NotificationsBell() {
  const unread = useUnreadCount();

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
      className="relative flex h-8 w-8 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

/** Full-width sidebar nav item with live unread badge. */
export function NotificationsNavItem({
  onClick,
}: {
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const unread   = useUnreadCount();
  const active   = pathname === "/notifications";

  return (
    <Link
      href="/notifications"
      onClick={onClick}
      aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-foreground/70 hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </span>
      Notifications
      {unread > 0 && (
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
