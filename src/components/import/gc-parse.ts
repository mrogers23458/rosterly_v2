import type { ImportPlayerInput, ImportRosterInput, ImportTeamInput } from "@/app/actions/import";
import { DIVISIONS, SEASONS, TEAM_TYPES } from "@/lib/constants/teams";

// ─── CSV text → 2D array ─────────────────────────────────────────────────────

export function parseCSVText(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    const row: string[] = [];
    let inQuote = false;
    let cell = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        row.push(cell);
        cell = "";
      } else {
        cell += ch;
      }
    }
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// ─── Filename → team metadata ────────────────────────────────────────────────

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function parseGCFilename(filename: string) {
  let base = filename.replace(/\.csv$/i, "").replace(/\s*Stats.*$/i, "").trim();

  const yearMatch = base.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
  if (yearMatch) base = base.replace(yearMatch[0], "").trim();

  const seasonMatch = base.match(/\b(Spring|Summer|Fall|Winter|Pre-Season|Post-Season)\b/i);
  const season = seasonMatch
    ? SEASONS.find((s) => s.toLowerCase() === seasonMatch[1].toLowerCase()) ?? cap(seasonMatch[1])
    : "";
  if (seasonMatch) base = base.replace(seasonMatch[0], "").trim();

  // Division: look for -AA-, -A-, etc.
  const divMatch = base.match(/[-\s](AAA|AA|A|Majors|Major)[-\s]/i);
  const division = divMatch
    ? (DIVISIONS.find((d) => d.toUpperCase() === divMatch[1].toUpperCase()) ?? divMatch[1].toUpperCase())
    : "";

  let organization = "";
  if (divMatch && divMatch.index !== undefined) {
    organization = base.slice(0, divMatch.index).replace(/[-_]+$/, "").trim();
  }

  // Full team name: clean up separators
  const name = base.replace(/[-_]+/g, " ").trim();

  return { name, year, season, division, organization };
}

// ─── Main parse function ─────────────────────────────────────────────────────

export type ParsedGCData = {
  team: Omit<ImportTeamInput, "age_group">;
  roster: Omit<ImportRosterInput, "team_id">;
  players: ImportPlayerInput[];
};

export function parseGameChangerCSV(text: string, filename: string): ParsedGCData {
  const rows = parseCSVText(text);
  if (rows.length < 3) throw new Error("File appears empty or unrecognised.");

  // Row 0 = category headers; Row 1 = column headers
  const headers = rows[1];

  // Find position innings columns by counting back from the last "Total" column.
  // Fielding tail: ...CI | P | C | 1B | 2B | 3B | SS | LF | CF | RF | SF | Total
  let lastTotalIdx = -1;
  for (let i = headers.length - 1; i >= 0; i--) {
    if (headers[i] === "Total") { lastTotalIdx = i; break; }
  }
  if (lastTotalIdx < 10) throw new Error("Could not locate fielding columns in CSV.");

  const posColMap: Record<string, number> = {
    P:   lastTotalIdx - 10,
    C:   lastTotalIdx - 9,
    "1B": lastTotalIdx - 8,
    "2B": lastTotalIdx - 7,
    "3B": lastTotalIdx - 6,
    SS:  lastTotalIdx - 5,
    LF:  lastTotalIdx - 4,
    CF:  lastTotalIdx - 3,
    RF:  lastTotalIdx - 2,
    // SF (lastTotalIdx - 1) is not a standard position in our schema — skip
  };

  const players: ImportPlayerInput[] = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const num  = row[0]?.trim();
    const last = row[1]?.trim();
    const first = row[2]?.trim();

    // Skip "Totals", blank rows, Glossary
    if (num === "Totals" || num === "Glossary") continue;
    if (!last && !first) continue;

    // Derive positions from innings played
    const posInnings: Array<{ pos: string; inn: number }> = [];
    for (const [pos, idx] of Object.entries(posColMap)) {
      const val = parseFloat(row[idx] ?? "0");
      if (val > 0) posInnings.push({ pos, inn: val });
    }
    posInnings.sort((a, b) => b.inn - a.inn);

    players.push({
      first_name:          first ?? "",
      last_name:           last ?? "",
      jersey_number:       num ?? "",
      primary_positions:   posInnings.length > 0 ? [posInnings[0].pos] : [],
      // Secondary: remaining positions with ≥ 1 inning
      secondary_positions: posInnings.slice(1).filter((p) => p.inn >= 1).map((p) => p.pos),
      bats:   "",
      throws: "",
      is_active: true,
    });
  }

  const meta = parseGCFilename(filename);

  const now = new Date();
  const rosterMonth = now.toLocaleString("default", { month: "long" });
  const rosterYear  = now.getFullYear().toString();

  return {
    team: {
      name:         meta.name,
      year:         meta.year,
      season:       meta.season,
      division:     meta.division,
      team_type:    TEAM_TYPES[0],
      organization: meta.organization,
      is_active:    true,
    },
    roster: {
      name:      `GameChanger Roster ${rosterMonth} ${rosterYear}`,
      season:    meta.season,
      year:      meta.year,
      notes:     `Imported from GameChanger on ${now.toLocaleDateString()}.`,
      is_active: true,
    },
    players,
  };
}
