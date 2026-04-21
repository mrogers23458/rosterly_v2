import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { Resend } from "resend";
import { getResendFromAddress } from "@/lib/resend-from";

// ── Service-role Supabase client (bypasses RLS) ───────────────────────────────
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ── Security: verify the request is from Vercel Cron or our own secret ────────
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const headerSecret = req.headers.get("x-cron-secret");
  const querySecret  = req.nextUrl.searchParams.get("secret");
  // Vercel Cron also sends Authorization: Bearer <CRON_SECRET>
  const authHeader   = req.headers.get("authorization");

  return (
    headerSecret === cronSecret ||
    querySecret  === cronSecret ||
    authHeader   === `Bearer ${cronSecret}`
  );
}

// ── Email helper ──────────────────────────────────────────────────────────────
function formatReminderSubject(
  kind: "event_reminder" | "rsvp_follow_up",
  eventTitle: string,
  minutesBefore: number,
): string {
  if (kind === "rsvp_follow_up") {
    return `Final RSVP reminder: ${eventTitle}`;
  }
  if (minutesBefore >= 1440) {
    const days = Math.round(minutesBefore / 1440);
    return `Reminder: ${eventTitle} in ${days} day${days !== 1 ? "s" : ""}`;
  }
  if (minutesBefore >= 60) {
    const hours = Math.round(minutesBefore / 60);
    return `Reminder: ${eventTitle} in ${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return `Reminder: ${eventTitle} in ${minutesBefore} minutes`;
}

function buildEmailHtml(params: {
  kind:         "event_reminder" | "rsvp_follow_up";
  eventTitle:    string;
  eventDate:     string;
  startTime:     string | null;
  location:      string | null;
  opponent:      string | null;
  eventType:     string;
  minutesBefore: number;
  appUrl:        string;
  eventId:       string;
}): string {
  const {
    kind,
    eventTitle, eventDate, startTime, location, opponent,
    minutesBefore, appUrl, eventId,
  } = params;

  const d = new Date(eventDate + "T00:00:00");
  const dateStr = d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const timeLabel = minutesBefore >= 1440
    ? `${Math.round(minutesBefore / 1440)} day${Math.round(minutesBefore / 1440) !== 1 ? "s" : ""}`
    : minutesBefore >= 60
      ? `${Math.round(minutesBefore / 60)} hour${Math.round(minutesBefore / 60) !== 1 ? "s" : ""}`
      : `${minutesBefore} minutes`;
  const subtitle = kind === "rsvp_follow_up"
    ? "Please respond to this event now."
    : `Starting in <strong>${timeLabel}</strong>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
    <div style="background:#1e40af;padding:20px 24px">
      <p style="margin:0;color:#fff;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px">
        Rosterly Reminder
      </p>
    </div>
    <div style="padding:24px">
      <h1 style="margin:0 0 4px;font-size:20px;color:#0f172a">${eventTitle}</h1>
      <p style="margin:0 0 16px;color:#64748b;font-size:14px">
        ${subtitle}
      </p>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;width:80px">Date</td>
          <td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600">${dateStr}</td>
        </tr>
        ${startTime ? `<tr><td style="padding:6px 0;font-size:13px;color:#64748b">Time</td><td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600">${formatTime(startTime)}</td></tr>` : ""}
        ${location  ? `<tr><td style="padding:6px 0;font-size:13px;color:#64748b">Location</td><td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600">${location}</td></tr>` : ""}
        ${opponent  ? `<tr><td style="padding:6px 0;font-size:13px;color:#64748b">Opponent</td><td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600">${opponent}</td></tr>` : ""}
      </table>
      <a href="${appUrl}/events/${eventId}"
         style="display:inline-block;margin-top:20px;background:#1e40af;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600">
        ${kind === "rsvp_follow_up" ? "Respond to RSVP" : "View event"} →
      </a>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 24px">
      <p style="margin:0;font-size:11px;color:#94a3b8">
        You received this because you're a member of this team on Rosterly.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export const maxDuration = 60; // allow up to 60s (Vercel Pro)

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();
  const appUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rosterlylineups.app";
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail    = getResendFromAddress();
  const resend       = resendApiKey ? new Resend(resendApiKey) : null;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  const canSendWebPush = Boolean(vapidPublicKey && vapidPrivateKey && vapidSubject);
  if (canSendWebPush) {
    webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!);
  }

  // ── Step 1: Fetch due reminders ─────────────────────────────────────────────
  const { data: dueReminders, error: fetchErr } = await supabase
    .rpc("get_due_reminders");

  if (fetchErr) {
    console.error("[cron/reminders] fetch error:", fetchErr);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const results: Array<{ reminderId: string; channel: string; status: string; recipients: number }> = [];

  for (const reminder of (dueReminders ?? [])) {
    // ── Step 2: Claim the log row (unique constraint prevents double-send) ───
    const { error: claimErr } = await supabase
      .from("event_reminder_logs")
      .insert({
        reminder_id:   reminder.reminder_id,
        scheduled_for: reminder.fire_at,
        status:        "pending",
      });

    // unique constraint means another worker already claimed it → skip
    if (claimErr) continue;

    let recipientCount = 0;
    let sendError: string | null = null;

    try {
      // ── Step 3: Resolve recipients ─────────────────────────────────────────
      let recipientEmails: string[]       = [];
      let recipientUserIds: string[]      = [];
      let recipientPhones: string[]       = [];
      let pushSubscriptions: Array<{
        endpoint: string;
        p256dh: string;
        auth: string;
        user_id: string;
      }> = [];
      let nonResponderCount = 0;

      if (reminder.team_id) {
        // Get all active team member user IDs
        const { data: members } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("team_id", reminder.team_id);

        const teamMemberUserIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
        recipientUserIds = teamMemberUserIds;

        if (reminder.audience === "non_responders") {
          const { data: responses } = await supabase
            .from("event_rsvps")
            .select("user_id")
            .eq("event_id", reminder.event_id);
          const respondedSet = new Set((responses ?? []).map((r: { user_id: string }) => r.user_id));
          recipientUserIds = teamMemberUserIds.filter((uid) => !respondedSet.has(uid));
          nonResponderCount = recipientUserIds.length;
        }

        if (reminder.channel === "email" || reminder.channel === "in_app") {
          // Get emails from auth.users via admin API
          for (const uid of recipientUserIds) {
            const { data: { user } } = await supabase.auth.admin.getUserById(uid);
            if (user?.email) recipientEmails.push(user.email);
          }
        }

        if (reminder.channel === "push" && recipientUserIds.length > 0) {
          const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("endpoint,p256dh,auth,user_id")
            .in("user_id", recipientUserIds)
            .eq("active", true);
          pushSubscriptions = (subscriptions ?? []) as typeof pushSubscriptions;
        }

        if (reminder.channel === "sms") {
          // Get guardian phone numbers from roster players linked to this event's roster
          if (reminder.event_id) {
            const { data: eventData } = await supabase
              .from("events")
              .select("roster_id")
              .eq("id", reminder.event_id)
              .single();

            if (eventData?.roster_id) {
              const { data: players } = await supabase
                .from("players")
                .select("parent_guardian_phone")
                .eq("roster_id", eventData.roster_id)
                .eq("is_active", true)
                .not("parent_guardian_phone", "is", null);

              recipientPhones = (players ?? [])
                .map((p: { parent_guardian_phone: string | null }) => p.parent_guardian_phone)
                .filter(Boolean) as string[];
            }
          }
        }
      } else {
        // Personal event — notify only the event owner
        if (reminder.channel === "email") {
          const { data: { user } } = await supabase.auth.admin.getUserById(reminder.event_owner_id);
          if (user?.email) recipientEmails = [user.email];
        }
        recipientUserIds = [reminder.event_owner_id];
        if (reminder.channel === "push") {
          const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("endpoint,p256dh,auth,user_id")
            .eq("user_id", reminder.event_owner_id)
            .eq("active", true);
          pushSubscriptions = (subscriptions ?? []) as typeof pushSubscriptions;
        }
      }

      // ── Step 4: Send ───────────────────────────────────────────────────────

      if (reminder.channel === "email" && resend && recipientEmails.length > 0) {
        const subject  = formatReminderSubject(reminder.kind, reminder.event_title, reminder.minutes_before);
        const html     = buildEmailHtml({
          kind:          reminder.kind,
          eventTitle:    reminder.event_title,
          eventDate:     reminder.event_date,
          startTime:     reminder.start_time,
          location:      reminder.location,
          opponent:      reminder.opponent,
          eventType:     reminder.event_type,
          minutesBefore: reminder.minutes_before,
          appUrl,
          eventId:       reminder.event_id,
        });

        for (const email of recipientEmails) {
          await resend.emails.send({
            from:    fromEmail,
            to:      email,
            subject,
            html,
          });
        }
        recipientCount = recipientEmails.length;
      }

      if (reminder.channel === "sms") {
        // Twilio — only if env vars are configured
        const twAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twAuthToken  = process.env.TWILIO_AUTH_TOKEN;
        const twFrom       = process.env.TWILIO_FROM_NUMBER;

        if (twAccountSid && twAuthToken && twFrom && recipientPhones.length > 0) {
          const body = `${formatReminderSubject(reminder.kind, reminder.event_title, reminder.minutes_before)}${reminder.location ? ` @ ${reminder.location}` : ""}`;
          const authB64 = Buffer.from(`${twAccountSid}:${twAuthToken}`).toString("base64");

          for (const phone of recipientPhones) {
            await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twAccountSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  Authorization: `Basic ${authB64}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({ To: phone, From: twFrom, Body: body }),
              },
            );
          }
          recipientCount = recipientPhones.length;
        }
      }

      if (reminder.channel === "in_app" && recipientUserIds.length > 0) {
        const subject = formatReminderSubject(reminder.kind, reminder.event_title, reminder.minutes_before);
        const notifRows = recipientUserIds.map((uid) => ({
          user_id:  uid,
          event_id: reminder.event_id,
          title:    subject,
          body:     [
            reminder.kind === "rsvp_follow_up" && "RSVP is still pending.",
            reminder.location && `📍 ${reminder.location}`,
            reminder.opponent && `vs. ${reminder.opponent}`,
          ].filter(Boolean).join(" · ") || null,
          link: `/events/${reminder.event_id}`,
        }));

        await supabase.from("notifications").insert(notifRows);
        recipientCount = notifRows.length;
      }

      if (reminder.channel === "push" && pushSubscriptions.length > 0 && canSendWebPush) {
        const title = formatReminderSubject(reminder.kind, reminder.event_title, reminder.minutes_before);
        const body = reminder.kind === "rsvp_follow_up"
          ? "RSVP is still pending. Tap to respond."
          : reminder.location
            ? `Upcoming at ${reminder.location}`
            : "Upcoming event reminder";

        for (const sub of pushSubscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              JSON.stringify({
                title,
                body,
                url: `${appUrl}/events/${reminder.event_id}`,
              }),
            );
          } catch (pushError) {
            const statusCode = (pushError as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await supabase
                .from("push_subscriptions")
                .update({ active: false, updated_at: new Date().toISOString() })
                .eq("endpoint", sub.endpoint)
                .eq("user_id", sub.user_id);
            }
          }
        }
        recipientCount = pushSubscriptions.length;
      }

      if (reminder.channel === "team_chat" && reminder.team_id) {
        if (reminder.audience !== "non_responders" || nonResponderCount > 0) {
          const body = reminder.kind === "rsvp_follow_up"
            ? `Final RSVP reminder: we're still waiting on ${nonResponderCount} response${nonResponderCount === 1 ? "" : "s"} for "${reminder.event_title}".`
            : `${formatReminderSubject(reminder.kind, reminder.event_title, reminder.minutes_before)}${reminder.location ? ` @ ${reminder.location}` : ""}`;
          await supabase.from("team_messages").insert({
            team_id: reminder.team_id,
            user_id: reminder.event_owner_id,
            sender_name: "Rosterly Bot",
            body,
          });
          recipientCount = 1;
        }
      }

    } catch (e) {
      sendError = e instanceof Error ? e.message : "Unknown send error";
      console.error(`[cron/reminders] send error for reminder ${reminder.reminder_id}:`, sendError);
    }

    // ── Step 5: Update log row ──────────────────────────────────────────────
    await supabase
      .from("event_reminder_logs")
      .update({
        status:          sendError ? "failed" : "sent",
        sent_at:         sendError ? null : new Date().toISOString(),
        recipient_count: recipientCount,
        error_msg:       sendError,
      })
      .eq("reminder_id", reminder.reminder_id)
      .eq("scheduled_for", reminder.fire_at);

    results.push({
      reminderId: reminder.reminder_id,
      channel:    reminder.channel,
      status:     sendError ? "failed" : "sent",
      recipients: recipientCount,
    });
  }

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
