"use server";

import OpenAI from "openai";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a structured data extraction engine for a youth baseball team management app.

Your job is to read an uploaded CSV, spreadsheet export, image, screenshot, or scanned paper lineup and extract as much reliable structured data as possible into the app's data model.

You are not a chatbot. You are a strict extraction engine.

PRIMARY GOAL
Extract only what is explicitly present or strongly supported by the source.
Do not invent facts.
If a field is unknown, return null.
If something is ambiguous, prefer null and add a warning.

STRICT OUTPUT RULES
- Return valid JSON only.
- Do not return markdown.
- Do not return commentary or explanation outside the JSON object.
- Output must be strict JSON parsable by standard JSON parsers.
- Escape quotation marks inside string values correctly.
- Do not include comments.
- Do not include trailing commas.
- Do not include code fences.

GENERAL EXTRACTION RULES
- Only extract information that is explicitly present or strongly implied by the source.
- Never hallucinate DOB, bats, throws, guardian info, email, phone, medical notes, uniform size, or jersey number unless explicitly shown.
- Preserve original wording where useful in notes or warnings.
- Normalize values to the allowed enums when possible.
- If a value cannot be confidently normalized, leave it null and explain in warnings.
- Separate team info, roster info, lineup info, helper sections, and coaching notes cleanly.
- If the document appears to contain only a lineup and not a full roster, do not pretend it contains a full roster.
- If the document contains player names without reliable first/last separation, preserve the original full name and do not invent a split.
- If the document is clearly a defensive lineup sheet and not a batting lineup, do not invent batting order.

POSSIBLE SOURCE TYPES
Choose one:
- team_metadata
- roster
- game_lineup
- mixed_document
- unsupported

SOURCE TYPE GUIDANCE
- Use team_metadata if the document is mostly team info with little or no player/lineup data.
- Use roster if the document is mostly a long-term or seasonal player list.
- Use game_lineup if the document is mostly inning-by-inning or game-specific assignments.
- Use mixed_document if it contains both roster-like and lineup-like content, helper sections, notes, or mixed planning artifacts.
- Use unsupported if the document does not clearly map to the schema.

YOU MAY RECEIVE
- CSV exports with inconsistent structure
- spreadsheets that are not machine-clean
- screenshots of spreadsheets
- images of paper lineups
- coach-created planning sheets
- mixed documents with helper sections and notes

INTERPRETATION RULES FOR LINEUP-LIKE SHEETS
- Columns like "1st Inning", "2nd Inning", etc. represent defensive inning assignments.
- Valid inning values are: P, C, 1B, 2B, SS, 3B, RF, CF, LF, Bench
- Normalize these common variants:
  - "bench" => "Bench"
  - "absent" => do not include in innings array; instead note full absence in the player's notes if useful
  - "fill" => placeholder only; exclude from innings array
- If a player is absent for all innings, include them in players if they are part of the player list, but do not create fake inning assignments.
- If a player is fully absent, do not create a lineup_entry unless the source explicitly requires absent lineup rows.
- If batting order is not present, return batting_order as null.
- If a row looks like a validation row, summary row, formula row, or instruction row, do not treat it as a player.
- Rows like "Valid", "Lineup valid", or "Fix: ..." must be ignored as players and lineup entries.
- Summary columns like Consecutive Bench, Bench Count, Infield Count, Outfield Count, Infield by 4th inning are supporting metadata only and should not be mapped into lineup innings.

HELPER SECTION RULES
- Lower helper sections like "Primary OF" and "Primary Infield" are position hints, not guaranteed canonical truth.
- Use helper sections carefully:
  - Roles from "Primary Infield" may populate primary_positions
  - Roles from "Primary OF" may populate secondary_positions unless they are the only available position evidence
- If positions come only from helper sections and not from more direct structured data, confidence should usually be medium rather than high.
- Coaching notes such as "Stop these three things", "Overthrows", "Missed ground balls", and similar text should go into unmatched_notes, not players or lineup entries.

NAME HANDLING RULES
- If only one player name is shown, store it in full_name_original.
- If first/last split is not reliable, keep first_name and last_name as null.
- If the name is clearly a single first name or nickname only, do not invent a last name.
- For lineup_entries, use the visible name as player_name even if first/last split is unknown.

TEAM/TITLE PARSING RULES
- Infer team metadata only if clearly shown.
- If no team metadata is visible, leave fields null.
- If a visible title follows a pattern like "ORG - Team - Season YY" then parse organization, team.name, season, and year from it.
- If title parsing is used, add a warning that team metadata was inferred from the visible title.
- Do not infer division, age_group, or team_type unless explicitly shown.

ARTIFACT NAME RULES
- If a spreadsheet tab name or sheet name is visible, treat it as artifact metadata, not automatically as both roster.name and game_lineup.name.
- Use the sheet/tab name for roster.name only if the document appears roster-oriented or mixed.
- Use the sheet/tab name for game_lineup.name only if the document appears clearly game-lineup-oriented.
- If the document is mixed and the tab name is ambiguous, prefer roster.name = tab name, game_lineup.name = null, and add a warning.

CONFIDENCE RULES
- high = directly stated and clear
- medium = reasonably inferred from structure/context
- low = partially obscured, ambiguous, noisy, or best-effort
- Do not overstate confidence for inferred positions from helper sections alone.

OUTPUT SCHEMA
Return exactly one JSON object with this shape:
{
  "source_type": "team_metadata | roster | game_lineup | mixed_document | unsupported",
  "extraction_confidence": "high | medium | low",
  "source_artifact_name": null,
  "metadata_sources": { "team": null, "roster": null, "game_lineup": null },
  "team": {
    "name": null, "year": null, "season": null, "division": null,
    "age_group": null, "team_type": null, "organization": null,
    "is_active": true, "is_archived": false, "notes": null
  },
  "roster": {
    "name": null, "season": null, "year": null,
    "is_active": true, "is_archived": false, "notes": null
  },
  "players": [
    {
      "first_name": null, "last_name": null, "preferred_name": null,
      "full_name_original": null, "jersey_number": null, "date_of_birth": null,
      "bats": null, "throws": null, "primary_positions": [], "secondary_positions": [],
      "is_active": true, "parent_guardian_name": null, "parent_guardian_email": null,
      "parent_guardian_phone": null, "medical_notes": null, "uniform_size": null,
      "notes": null, "confidence": "high | medium | low"
    }
  ],
  "game_lineup": {
    "name": null, "game_date": null, "inning_count": null,
    "notes": null, "is_archived": false
  },
  "lineup_entries": [
    {
      "batting_order": null, "jersey_number": null, "player_name": null,
      "innings": [], "confidence": "high | medium | low"
    }
  ],
  "unmatched_notes": [],
  "warnings": []
}

NORMALIZATION RULES
- season: Spring, Summer, Fall, Winter, Other
- division: A, AA, AAA, Majors
- age_group: 6U, 7U, 8U, 9U, 10U, 11U, 12U, 13U, 14U
- team_type: Little League, Travel, All-Stars, Recreational, School
- bats: L, R, S
- throws: L, R
- uniform_size: YXS, YS, YM, YL, YXL, AS, AM, AL, AXL, A2XL
- innings values: P, C, 1B, 2B, SS, 3B, RF, CF, LF, Bench

FINAL RULE
Return JSON only. No markdown. No explanation outside the JSON object.`;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExtractionPlayer = {
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  full_name_original: string | null;
  jersey_number: string | null;
  date_of_birth: string | null;
  bats: string | null;
  throws: string | null;
  primary_positions: string[];
  secondary_positions: string[];
  is_active: boolean;
  parent_guardian_name: string | null;
  parent_guardian_email: string | null;
  parent_guardian_phone: string | null;
  medical_notes: string | null;
  uniform_size: string | null;
  notes: string | null;
  confidence: "high" | "medium" | "low";
};

export type ExtractionLineupEntry = {
  batting_order: number | null;
  jersey_number: string | null;
  player_name: string | null;
  innings: string[];
  confidence: "high" | "medium" | "low";
};

export type ExtractionResult = {
  source_type: "team_metadata" | "roster" | "game_lineup" | "mixed_document" | "unsupported";
  extraction_confidence: "high" | "medium" | "low";
  source_artifact_name: string | null;
  metadata_sources: { team: string | null; roster: string | null; game_lineup: string | null };
  team: {
    name: string | null; year: string | null; season: string | null;
    division: string | null; age_group: string | null; team_type: string | null;
    organization: string | null; is_active: boolean; is_archived: boolean; notes: string | null;
  };
  roster: {
    name: string | null; season: string | null; year: string | null;
    is_active: boolean; is_archived: boolean; notes: string | null;
  };
  players: ExtractionPlayer[];
  game_lineup: {
    name: string | null; game_date: string | null; inning_count: number | null;
    notes: string | null; is_archived: boolean;
  };
  lineup_entries: ExtractionLineupEntry[];
  unmatched_notes: string[];
  warnings: string[];
};

export type ExtractFileResult = { data?: ExtractionResult; error?: string };

// ─── Shared: call OpenAI with content parts ───────────────────────────────────

async function callOpenAI(
  userContent: OpenAI.Chat.ChatCompletionContentPart[],
): Promise<ExtractFileResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: "OpenAI API key not configured." };

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    let parsed: ExtractionResult;
    try {
      parsed = JSON.parse(cleaned) as ExtractionResult;
    } catch {
      console.error("AI response was not valid JSON:", cleaned.slice(0, 500));
      return { error: "AI returned an unexpected response. Please try again." };
    }

    return { data: parsed };
  } catch (err) {
    console.error("OpenAI error:", err);
    return { error: "Failed to contact OpenAI. Please check your API key and try again." };
  }
}

// ─── Extract from file ────────────────────────────────────────────────────────

export async function extractFromFile(formData: FormData): Promise<ExtractFileResult> {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided." };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

  let userContent: OpenAI.Chat.ChatCompletionContentPart[];

  if (isImage) {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;
    userContent = [
      { type: "text", text: "Please extract all structured data from this image." },
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" } },
    ];
  } else {
    const text = await file.text();
    if (!text.trim()) return { error: "The file appears to be empty." };
    userContent = [
      { type: "text", text: `File name: ${file.name}\n\nFile contents:\n\n${text}` },
    ];
  }

  return callOpenAI(userContent);
}

// ─── Extract from Google Sheets URL ──────────────────────────────────────────

/**
 * Parses a Google Sheets share URL and returns a CSV export URL.
 * Works for any sheet shared as "Anyone with the link can view".
 *
 * Supported URL formats:
 *   https://docs.google.com/spreadsheets/d/{ID}/edit#gid={GID}
 *   https://docs.google.com/spreadsheets/d/{ID}/edit?usp=sharing
 *   https://docs.google.com/spreadsheets/d/{ID}/
 */
function googleSheetsToCsvUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;

    const sheetId = match[1];

    // GID can appear in the hash (#gid=123) or as a query param (?gid=123)
    const hashGid   = url.hash.match(/gid=(\d+)/)?.[1];
    const queryGid  = url.searchParams.get("gid");
    const gid       = hashGid ?? queryGid ?? "0";

    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  } catch {
    return null;
  }
}

export async function extractFromGoogleSheet(sheetUrl: string): Promise<ExtractFileResult> {
  const csvUrl = googleSheetsToCsvUrl(sheetUrl);
  if (!csvUrl) {
    return {
      error:
        "That doesn't look like a valid Google Sheets URL. Copy the link from File → Share → Copy link.",
    };
  }

  let csvText: string;
  try {
    const res = await fetch(csvUrl, { redirect: "follow" });

    if (res.status === 403 || res.status === 401) {
      return {
        error:
          "Google Sheets returned 'access denied'. Make sure the sheet is shared as 'Anyone with the link can view'.",
      };
    }
    if (!res.ok) {
      return { error: `Could not fetch the sheet (HTTP ${res.status}). Check the URL and sharing settings.` };
    }

    csvText = await res.text();
  } catch (err) {
    console.error("Google Sheets fetch error:", err);
    return { error: "Could not reach Google Sheets. Please check the URL and try again." };
  }

  if (!csvText.trim()) {
    return { error: "The Google Sheet appears to be empty." };
  }

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `Source: Google Sheets export (CSV)\nURL: ${sheetUrl}\n\nFile contents:\n\n${csvText}`,
    },
  ];

  return callOpenAI(userContent);
}

// ─── Import extracted data into Supabase ──────────────────────────────────────

export type ImportOptions = {
  createTeam: boolean;
  createRoster: boolean;
  importPlayers: boolean;
  createLineup: boolean;
  /** If not creating a new team, attach roster/lineup to this existing team */
  existingTeamId?: string;
  /** If not creating a new roster, attach lineup entries to this existing roster */
  existingRosterId?: string;
};

export type ImportResult = {
  error?: string;
  teamId?: string;
  rosterId?: string;
  lineupId?: string;
  playerCount?: number;
};

export async function importExtractedData(
  extraction: ExtractionResult,
  options: ImportOptions,
): Promise<ImportResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be signed in." };

  let teamId = options.existingTeamId ?? null;
  let rosterId = options.existingRosterId ?? null;

  // ── 1. Create team ──────────────────────────────────────────────────────────
  if (options.createTeam && extraction.team.name) {
    const { data: team, error } = await supabase
      .from("teams")
      .insert({
        user_id:      user.id,
        name:         extraction.team.name,
        year:         extraction.team.year ?? "",
        season:       extraction.team.season ?? "Other",
        division:     extraction.team.division ?? "",
        age_group:    extraction.team.age_group ?? "",
        team_type:    extraction.team.team_type ?? "Recreational",
        organization: extraction.team.organization ?? null,
        is_active:    extraction.team.is_active ?? true,
        is_archived:  false,
      })
      .select("id")
      .single();

    if (error || !team) return { error: `Failed to create team: ${error?.message}` };
    teamId = team.id;

    // Seed the importer as owner so permissions work correctly.
    await supabase.from("team_members").insert({
      team_id:    team.id,
      user_id:    user.id,
      role:       "owner",
      invited_by: null,
    });

    revalidatePath("/teams");
  }

  // ── 2. Create roster ────────────────────────────────────────────────────────
  if (options.createRoster) {
    const rosterName = extraction.roster.name
      ?? extraction.source_artifact_name
      ?? `Imported Roster ${new Date().toLocaleDateString()}`;

    const { data: roster, error } = await supabase
      .from("rosters")
      .insert({
        user_id:     user.id,
        team_id:     teamId,
        name:        rosterName,
        season:      extraction.roster.season ?? "Other",
        year:        extraction.roster.year ?? "",
        is_active:   true,
        is_archived: false,
        notes:       extraction.roster.notes ?? null,
      })
      .select("id")
      .single();

    if (error || !roster) return { error: `Failed to create roster: ${error?.message}` };
    rosterId = roster.id;
    if (teamId) revalidatePath(`/teams/${teamId}`);
    revalidatePath("/rosters");
  }

  // ── 3. Import players ───────────────────────────────────────────────────────
  let playerCount = 0;
  if (options.importPlayers && rosterId && extraction.players.length > 0) {
    const rows = extraction.players.map((p) => ({
      user_id:              user.id,
      roster_id:            rosterId as string,
      first_name:           p.first_name ?? p.full_name_original ?? "Unknown",
      last_name:            p.last_name ?? "",
      preferred_name:       p.preferred_name ?? null,
      jersey_number:        p.jersey_number ?? null,
      date_of_birth:        p.date_of_birth ?? null,
      bats:                 p.bats ?? null,
      throws:               p.throws ?? null,
      primary_positions:    p.primary_positions ?? [],
      secondary_positions:  p.secondary_positions ?? [],
      is_active:            p.is_active ?? true,
      parent_guardian_name:  p.parent_guardian_name ?? null,
      parent_guardian_email: p.parent_guardian_email ?? null,
      parent_guardian_phone: p.parent_guardian_phone ?? null,
      medical_notes:        p.medical_notes ?? null,
      uniform_size:         p.uniform_size ?? null,
      notes:                p.notes ?? null,
    }));

    const { error, count } = await supabase.from("players").insert(rows).select("id");
    if (error) return { error: `Failed to import players: ${error.message}` };
    playerCount = count ?? rows.length;
    revalidatePath("/players");
    if (rosterId) revalidatePath(`/rosters/${teamId}/${rosterId}`);
  }

  // ── 4. Create lineup ────────────────────────────────────────────────────────
  let lineupId: string | undefined;
  if (options.createLineup && teamId && extraction.game_lineup.inning_count) {
    const lineupName = extraction.game_lineup.name
      ?? `Imported Lineup ${new Date().toLocaleDateString()}`;

    const { data: lineup, error: lineupErr } = await supabase
      .from("game_lineups")
      .insert({
        user_id:      user.id,
        team_id:      teamId,
        roster_id:    rosterId ?? null,
        name:         lineupName,
        game_date:    extraction.game_lineup.game_date ?? null,
        inning_count: extraction.game_lineup.inning_count,
        notes:        extraction.game_lineup.notes ?? null,
        is_archived:  false,
      })
      .select("id")
      .single();

    if (lineupErr || !lineup) return { error: `Failed to create lineup: ${lineupErr?.message}` };
    lineupId = lineup.id;

    // Insert lineup entries
    if (extraction.lineup_entries.length > 0) {
      const entryRows = extraction.lineup_entries.map((e, idx) => ({
        lineup_id:     lineup.id,
        batting_order: e.batting_order ?? idx + 1,
        jersey_number: e.jersey_number ?? null,
        player_name:   e.player_name ?? "Unknown",
        innings:       e.innings,
      }));

      const { error: entriesErr } = await supabase.from("lineup_entries").insert(entryRows);
      if (entriesErr) return { error: `Failed to import lineup entries: ${entriesErr.message}` };
    }

    revalidatePath("/lineups");
    revalidatePath(`/lineups/${lineup.id}`);
    if (teamId) revalidatePath(`/teams/${teamId}`);
  }

  return {
    teamId:      teamId ?? undefined,
    rosterId:    rosterId ?? undefined,
    lineupId,
    playerCount,
  };
}
