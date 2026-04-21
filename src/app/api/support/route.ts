import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/utils/supabase/server";

const SUPPORT_TO = [
  "mrogers23458@gmail.com",
  "support@rosterlylineups.app",
] as const;

const CATEGORY_VALUES = [
  "feature_request",
  "bug",
  "feedback",
  "other",
] as const;

type SupportCategory = (typeof CATEGORY_VALUES)[number];

const CATEGORY_LABEL: Record<SupportCategory, string> = {
  feature_request: "Feature request",
  bug:             "Bug report",
  feedback:        "Feedback",
  other:           "Other",
};

const MAX_MESSAGE = 10_000;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function isSupportCategory(v: string): v is SupportCategory {
  return (CATEGORY_VALUES as readonly string[]).includes(v);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart form data." },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const categoryRaw = String(form.get("category") ?? "").trim();
  if (!isSupportCategory(categoryRaw)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  const category = categoryRaw;

  const message = String(form.get("message") ?? "").trim();
  if (!message) {
    return NextResponse.json(
      { error: "Please enter a message." },
      { status: 400 },
    );
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: `Message must be at most ${MAX_MESSAGE} characters.` },
      { status: 400 },
    );
  }

  const file = form.get("attachment");
  let attachment:
    | { filename: string; content: Buffer }
    | undefined;

  if (file instanceof File && file.size > 0) {
    if (category !== "bug") {
      return NextResponse.json(
        { error: "Attachments are only allowed for bug reports." },
        { status: 400 },
      );
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json(
        { error: "Attachment must be 5 MB or smaller." },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const name = file.name?.trim() || "attachment";
    attachment = { filename: name, content: buf };
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("[api/support] RESEND_API_KEY is not set");
    return NextResponse.json(
      { error: "Email is not configured. Please try again later." },
      { status: 503 },
    );
  }

  const from =
    process.env.SUPPORT_FROM_EMAIL ??
    process.env.REMINDER_FROM_EMAIL ??
    "Rosterly <onboarding@resend.dev>";

  const label = CATEGORY_LABEL[category];
  const subject = `[Rosterly] ${label} from ${user.email ?? user.id}`;

  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a">
  <p style="margin:0 0 12px"><strong>${escapeHtml(label)}</strong></p>
  <table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">
    <tr><td style="padding:4px 12px 4px 0;color:#64748b">User</td><td>${escapeHtml(user.email ?? "(no email)")}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#64748b">User ID</td><td style="word-break:break-all">${escapeHtml(user.id)}</td></tr>
  </table>
  <p style="margin:0 0 8px;font-size:13px;color:#64748b">Message</p>
  <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#f8fafc;font-size:14px">${safeMessage}</div>
</body>
</html>`;

  const resend = new Resend(resendKey);
  const { error: sendErr } = await resend.emails.send({
    from,
    to:   [...SUPPORT_TO],
    subject,
    html,
    ...(user.email ? { replyTo: user.email } : {}),
    attachments: attachment
      ? [
          {
            filename: attachment.filename,
            content:  attachment.content,
          },
        ]
      : undefined,
  });

  if (sendErr) {
    console.error("[api/support] Resend error:", sendErr);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
