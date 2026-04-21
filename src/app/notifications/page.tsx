import { Bell, Check } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { markNotificationsRead } from "@/app/actions/reminders";
import { Button } from "@/components/ui/button";
import type { AppNotification } from "@/lib/constants/reminders";

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = user
    ? await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: null };

  const notifications = (data ?? []) as AppNotification[];
  const unreadIds     = notifications.filter((n) => !n.read_at).map((n) => n.id);

  function fmtDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH  = diffMs / (1000 * 60 * 60);
    if (diffH < 1)  return `${Math.max(1, Math.round(diffH * 60))} min ago`;
    if (diffH < 24) return `${Math.round(diffH)} hr ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Event reminders and updates from your teams.
          </p>
        </div>

        {unreadIds.length > 0 && (
          <form
            action={async () => {
              "use server";
              await markNotificationsRead(unreadIds);
            }}
          >
            <Button variant="outline" size="sm" type="submit" className="w-full gap-1.5 sm:w-auto">
              <Check className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Bell className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
          <p className="text-xs text-muted-foreground">
            Set up reminders on your events to receive alerts here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20 ${
                !n.read_at ? "bg-primary/5" : "bg-card"
              }`}
            >
              {/* Unread dot */}
              <div className="mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                {!n.read_at && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className={`text-sm ${!n.read_at ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-[11px] text-muted-foreground">{fmtDate(n.created_at)}</span>
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
