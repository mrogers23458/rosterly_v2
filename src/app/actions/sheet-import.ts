"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ImportPlayerInput } from "@/app/actions/import";

// ─── Fetch a Google Sheet as CSV ──────────────────────────────────────────────

function sheetUrlToCsv(input: string): string | null {
  try {
    const url = new URL(input.trim());
    const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    const sheetId = match[1];
    const hashGid  = url.hash.match(/gid=(\d+)/)?.[1];
    const queryGid = url.searchParams.get("gid");
    const gid      = hashGid ?? queryGid ?? "0";
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  } catch {
    return null;
  }
}

export async function fetchSheetCsv(
  sheetUrl: string,
): Promise<{ csv?: string; error?: string }> {
  const csvUrl = sheetUrlToCsv(sheetUrl);
  if (!csvUrl) {
    return {
      error:
        "That doesn't look like a valid Google Sheets URL. Copy the link from File → Share → Copy link.",
    };
  }

  try {
    const res = await fetch(csvUrl, { redirect: "follow" });

    if (res.status === 403 || res.status === 401) {
      return {
        error:
          "Access denied. Make sure the sheet is shared as 'Anyone with the link can view'.",
      };
    }
    if (!res.ok) {
      return {
        error: `Could not fetch the sheet (HTTP ${res.status}). Check the URL and sharing settings.`,
      };
    }

    const csv = await res.text();
    if (!csv.trim()) return { error: "The Google Sheet appears to be empty." };

    return { csv };
  } catch {
    return { error: "Could not reach Google Sheets. Check the URL and try again." };
  }
}

// ─── Import sheet data into Supabase ──────────────────────────────────────────

export type SheetImportPayload = {
  team?: {
    name: string;
    year: string;
    season: string;
    division: string;
    age_group: string;
    team_type: string;
    organization: string;
    is_active: boolean;
  };
  roster: {
    name: string;
    season: string;
    year: string;
    notes: string;
    is_active: boolean;
  };
  players: ImportPlayerInput[];
  existingTeamId?: string;
};

export type SheetImportResult = {
  teamId?:     string;
  rosterId?:   string;
  playerCount: number;
  error?:      string;
};

export async function importSheetData(
  payload: SheetImportPayload,
): Promise<SheetImportResult> {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { playerCount: 0, error: "Not authenticated." };

  let teamId = payload.existingTeamId ?? null;

  // ── Create team ────────────────────────────────────────────────────────────
  if (payload.team && !teamId) {
    const { data: teamData, error: teamErr } = await supabase
      .from("teams")
      .insert({
        name:         payload.team.name,
        year:         payload.team.year,
        season:       payload.team.season,
        division:     payload.team.division,
        age_group:    payload.team.age_group,
        team_type:    payload.team.team_type,
        organization: payload.team.organization,
        is_active:    payload.team.is_active,
        user_id:      user.id,
      })
      .select("id")
      .single();

    if (teamErr || !teamData) {
      return { playerCount: 0, error: teamErr?.message ?? "Failed to create team." };
    }
    teamId = teamData.id as string;
  }

  if (!teamId) return { playerCount: 0, error: "No team specified." };

  // ── Create roster ──────────────────────────────────────────────────────────
  const { data: rosterData, error: rosterErr } = await supabase
    .from("rosters")
    .insert({
      team_id:  teamId,
      name:     payload.roster.name,
      season:   payload.roster.season,
      year:     payload.roster.year,
      notes:    payload.roster.notes,
      is_active: payload.roster.is_active,
      user_id:  user.id,
    })
    .select("id")
    .single();

  if (rosterErr || !rosterData) {
    return {
      teamId:      teamId,
      playerCount: 0,
      error:       rosterErr?.message ?? "Failed to create roster.",
    };
  }

  const rosterId = rosterData.id as string;

  // ── Create players ─────────────────────────────────────────────────────────
  if (payload.players.length > 0) {
    const records = payload.players.map((p) => ({
      roster_id:           rosterId,
      team_id:             teamId!,
      first_name:          p.first_name,
      last_name:           p.last_name,
      jersey_number:       p.jersey_number || null,
      primary_positions:   p.primary_positions,
      secondary_positions: p.secondary_positions,
      bats:                p.bats || null,
      throws:              p.throws || null,
      is_active:           p.is_active,
      user_id:             user.id,
    }));

    const { error: playersErr } = await supabase.from("players").insert(records);
    if (playersErr) {
      return {
        teamId,
        rosterId,
        playerCount: 0,
        error:       playersErr.message,
      };
    }
  }

  revalidatePath("/teams");
  revalidatePath("/rosters");
  revalidatePath("/players");
  if (teamId) {
    revalidatePath(`/teams/${teamId}`);
    revalidatePath(`/rosters/${teamId}/${rosterId}`);
  }

  return { teamId, rosterId, playerCount: payload.players.length };
}
