import webpush from "web-push";
import { createAdminClient } from "@/utils/supabase/admin";

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@rosterlylineups.com";

type PushPayload = {
  title: string;
  body:  string;
  url:   string;
};

/**
 * Send a web push notification to each active subscription for the given user IDs.
 * Silently no-ops if VAPID keys are missing or no subscriptions exist.
 * Individual delivery failures are swallowed so one bad subscription never
 * blocks the rest.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || userIds.length === 0) return;

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", userIds)
    .eq("active", true);

  if (!subs?.length) return;

  await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        )
        .catch(() => {}),
    ),
  );
}
