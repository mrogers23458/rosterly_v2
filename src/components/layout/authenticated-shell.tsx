"use client";

import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LayoutList,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { RosterlyLogo } from "@/components/branding/rosterly-logo";
import { ChatFlyoutProvider, useChatFlyout } from "@/components/chat/chat-flyout-context";
import { MessagesFlyout } from "@/components/chat/messages-flyout";
import { ContactSupportModal } from "@/components/layout/contact-support-modal";
import { NotificationsBell, NotificationsNavItem } from "@/components/layout/notifications-bell";
import { useUnreadMessageCount } from "@/hooks/use-unread-message-count";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  matchFn: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    matchFn: (p) => p === "/dashboard",
  },
  {
    label: "Teams",
    href: "/teams",
    icon: Users,
    matchFn: (p) => p === "/teams" || p.startsWith("/teams/"),
  },
  {
    label: "Rosters",
    href: "/rosters",
    icon: ClipboardList,
    matchFn: (p) => p === "/rosters" || p.startsWith("/rosters/"),
  },
  {
    label: "Players",
    href: "/players",
    icon: UserCircle2,
    matchFn: (p) => p === "/players" || p.startsWith("/players/"),
  },
  {
    label: "Lineups",
    href: "/lineups",
    icon: LayoutList,
    matchFn: (p) => p === "/lineups" || p.startsWith("/lineups/"),
  },
  {
    label: "Events",
    href: "/events",
    icon: CalendarDays,
    matchFn: (p) => p === "/events" || p.startsWith("/events/"),
  },
  {
    label: "Stats",
    href: "/stats",
    icon: BarChart3,
    matchFn: (p) => p === "/stats" || p.startsWith("/stats/"),
  },
];

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function SidebarContents({
  pathname,
  onClose,
  onLogout,
  onOpenSupport,
  onOpenMessages,
  unreadMessages,
}: {
  pathname: string;
  onClose: () => void;
  onLogout: () => void;
  onOpenSupport: () => void;
  onOpenMessages: () => void;
  unreadMessages: number;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <RosterlyLogo size={36} />
        <span className="text-base font-bold text-primary">Rosterly</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {/* Notifications first — most time-sensitive item */}
        <NotificationsNavItem onClick={onClose} />

        {navItems.map((item) => {
          const active = item.matchFn(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* Messages with unread badge */}
        <button
          type="button"
          onClick={() => {
            onOpenMessages();
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <div className="relative shrink-0">
            <MessageSquare className="h-4 w-4" />
            {unreadMessages > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </div>
          Messages
          <UnreadBadge count={unreadMessages} />
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenSupport();
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <LifeBuoy className="h-4 w-4 shrink-0" />
          Contact support
        </button>
      </nav>

      <div className="border-t border-border p-2">
        <Link
          href="/profile"
          onClick={onClose}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/profile"
              ? "bg-primary/10 text-primary"
              : "text-foreground/70 hover:bg-muted hover:text-foreground",
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          My profile
        </Link>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log out
        </button>
      </div>
    </div>
  );
}

/**
 * Tiny component that reads ?openMessages=1 and opens the chat flyout.
 * Must be wrapped in <Suspense> because it uses useSearchParams.
 */
function OpenMessagesDeepLink() {
  const searchParams = useSearchParams();
  const { setOpen: setChatFlyoutOpen } = useChatFlyout();
  const { reset: resetMessageCount }   = useUnreadMessageCount();

  useEffect(() => {
    if (searchParams.get("openMessages") === "1") {
      setChatFlyoutOpen(true);
      resetMessageCount();
      const url = new URL(window.location.href);
      url.searchParams.delete("openMessages");
      window.history.replaceState({}, "", url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

function AuthenticatedShellInner({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname();
  const router      = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { setOpen: setChatFlyoutOpen } = useChatFlyout();
  const { count: unreadMessages, reset: resetMessageCount } = useUnreadMessageCount();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function handleOpenMessages() {
    setChatFlyoutOpen(true);
    resetMessageCount();
  }

  const sidebarProps = {
    pathname,
    onClose:         () => setMobileOpen(false),
    onLogout:        handleLogout,
    onOpenSupport:   () => setSupportOpen(true),
    onOpenMessages:  handleOpenMessages,
    unreadMessages,
  };

  return (
    <div className="flex min-h-dvh bg-background [--sidebar-w:16rem]">
      <ContactSupportModal open={supportOpen} onOpenChange={setSupportOpen} />
      <MessagesFlyout />
      {/* Deep-link handler — wrapped in Suspense because it uses useSearchParams */}
      <Suspense fallback={null}>
        <OpenMessagesDeepLink />
      </Suspense>

      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 border-r border-border bg-white transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3.5 rounded p-1 text-foreground/60 hover:text-foreground"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContents {...sidebarProps} />
      </aside>

      <aside className="fixed left-0 top-0 hidden h-full w-64 flex-col border-r border-border bg-white md:flex">
        <SidebarContents {...sidebarProps} />
      </aside>

      <div className="flex min-h-dvh w-full flex-col md:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-white px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="-ml-1 rounded p-2 text-foreground/60 hover:text-foreground"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <RosterlyLogo size={30} />
          <span className="text-base font-bold text-primary">Rosterly</span>
          <div className="ml-auto flex items-center gap-1">
            {/* Messages button with badge for mobile header */}
            <button
              type="button"
              onClick={handleOpenMessages}
              className="relative rounded p-2 text-foreground/60 hover:text-foreground"
              aria-label="Open messages"
            >
              <MessageSquare className="h-5 w-5" />
              {unreadMessages > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </button>
            <NotificationsBell />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  return (
    <ChatFlyoutProvider>
      <AuthenticatedShellInner>{children}</AuthenticatedShellInner>
    </ChatFlyoutProvider>
  );
}
