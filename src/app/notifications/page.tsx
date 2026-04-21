import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NotificationList } from "@/components/notifications/notification-list";
import type { AppNotification } from "@/lib/constants/reminders";

export const metadata = { title: "Notifications — Rosterly" };

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
        .limit(200)
    : { data: null };

  const notifications = (data ?? []) as AppNotification[];

  return (
    <div className="px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your history of event reminders and team updates.
        </p>
      </div>

      <div className="max-w-2xl">
        <NotificationList initialNotifications={notifications} />
      </div>
    </div>
  );
}
