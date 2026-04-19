"use client";

import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Menu,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { RosterlyLogo } from "@/components/branding/rosterly-logo";
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
    matchFn: (p) => p === "/players",
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
}: {
  pathname: string;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo row */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <RosterlyLogo size={36} />
        <span className="text-base font-bold text-primary">Rosterly</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
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
      </nav>

      {/* Logout */}
      <div className="border-t border-border p-2">
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

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

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
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Mobile overlay ── */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      {/* ── Mobile drawer ── */}
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

      {/* ── Desktop sidebar (permanent, md+) ── */}
      <aside className="fixed left-0 top-0 hidden h-full w-64 flex-col border-r border-border bg-white md:flex">
        <SidebarContents {...sidebarProps} />
      </aside>

      {/* ── Main content area ── */}
      <div className="flex min-h-screen w-full flex-col md:pl-64">
        {/* Mobile top bar */}
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
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
