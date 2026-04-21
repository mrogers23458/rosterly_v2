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
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { RosterlyLogo } from "@/components/branding/rosterly-logo";
import { ChatFlyoutProvider, useChatFlyout } from "@/components/chat/chat-flyout-context";
import { MessagesFlyout } from "@/components/chat/messages-flyout";
import { ContactSupportModal } from "@/components/layout/contact-support-modal";
import { NotificationsBell, NotificationsNavItem } from "@/components/layout/notifications-bell";
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

function SidebarContents({
  pathname,
  onClose,
  onLogout,
  onOpenSupport,
  onOpenMessages,
}: {
  pathname: string;
  onClose: () => void;
  onLogout: () => void;
  onOpenSupport: () => void;
  onOpenMessages: () => void;
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

        <button
          type="button"
          onClick={() => {
            onOpenMessages();
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          Messages
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

function AuthenticatedShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { setOpen: setChatFlyoutOpen } = useChatFlyout();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const sidebarProps = {
    pathname,
    onClose: () => setMobileOpen(false),
    onLogout: handleLogout,
    onOpenSupport: () => setSupportOpen(true),
    onOpenMessages: () => setChatFlyoutOpen(true),
  };

  return (
    <div className="flex min-h-dvh bg-background [--sidebar-w:16rem]">
      <ContactSupportModal open={supportOpen} onOpenChange={setSupportOpen} />
      <MessagesFlyout />

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
            <button
              type="button"
              onClick={() => setChatFlyoutOpen(true)}
              className="rounded p-2 text-foreground/60 hover:text-foreground"
              aria-label="Open messages"
            >
              <MessageSquare className="h-5 w-5" />
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
