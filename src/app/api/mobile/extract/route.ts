import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Re-use the same system prompt and callOpenAI logic from ai-import.ts
// (inlined here to keep this route self-contained)
const SYSTEM_PROMPT = `You are a structured data extraction engine for a youth baseball team management app. Extract structured data into the app's data model as JSON. Return ONLY valid JSON, no markdown, no code fences, no commentary.

Required output shape:
{
  "source_type": "roster|game_lineup|mixed_document|team_metadata|unsupported",
  "team": { "name": string|null, "year": number|null, "season": string|null, "division": string|null, "age_group": string|null, "team_type": string|null, "organization": string|null },
  "roster": { "name": string|null, "season": string|null, "year": number|null },
  "players": [{ "first_name": string, "last_name": string, "jersey_number": string|null, "primary_positions": string[], "secondary_positions": string[], "bats": string|null, "throws": string|null }],
  "game_lineup": { "name": string|null, "game_date": string|null, "inning_count": number|null },
  "lineup_entries": [{ "batting_order": number, "player_name": string, "jersey_number": string|null, "innings": string[] }],
  "warnings": string[]
}`;

async function callOpenAI(
  content: OpenAI.Chat.ChatCompletionContentPart[],
): Promise<{ data?: unknown; error?: string }> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ],
  });
  const raw = response.choices[0]?.message?.content ?? "";
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    return { data: JSON.parse(cleaned) };
  } catch {
    return { error: "AI returned an unexpected response. Please try again." };
  }
}

function sheetUrlToCsv(input: string): string | null {
  try {
    const url = new URL(input.trim());
    const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    const gid = url.hash.match(/gid=(\d+)/)?.[1] ?? url.searchParams.get("gid") ?? "0";
    return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: { user }, error: authErr } = await svc.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Dispatch ──────────────────────────────────────────────────────────────
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    // AI import from file (image, CSV, etc.)
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

    let content: OpenAI.Chat.ChatCompletionContentPart[];
    if (isImage) {
      const buf = await file.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      const mime = file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;
      content = [
        { type: "text", text: "Extract all structured data from this image." },
        { type: "image_url", image_url: { url: `data:${mime};base64,${b64}`, detail: "high" } },
      ];
    } else {
      const text = await file.text();
      if (!text.trim()) return NextResponse.json({ error: "File is empty." }, { status: 400 });
      content = [{ type: "text", text: `File name: ${file.name}\n\nContents:\n${text}` }];
    }
    const result = await callOpenAI(content);
    return NextResponse.json(result);
  }

  // Sheets import
  const body = await req.json().catch(() => ({}));
  const sheetUrl = body.sheetUrl as string | undefined;
  if (!sheetUrl) return NextResponse.json({ error: "sheetUrl required." }, { status: 400 });

  const csvUrl = sheetUrlToCsv(sheetUrl);
  if (!csvUrl) return NextResponse.json({ error: "Invalid Google Sheets URL." }, { status: 400 });

  const csvRes = await fetch(csvUrl);
  if (!csvRes.ok) {
    return NextResponse.json(
      { error: "Could not fetch the sheet. Make sure it's shared as 'Anyone with the link'." },
      { status: 400 },
    );
  }
  const csv = await csvRes.text();
  const content: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "text", text: `Google Sheet CSV:\n\n${csv}` },
  ];
  const result = await callOpenAI(content);
  return NextResponse.json(result);
}
