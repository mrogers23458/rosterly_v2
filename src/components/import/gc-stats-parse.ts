import { parseCSVText, parseGCFilename } from "./gc-parse";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ParsedGCPlayerStats = {
  jersey_number:   string;
  last_name:       string;
  first_name:      string;
  games_played:    number;
  // Batting
  at_bats:         number;
  hits:            number;
  doubles:         number;
  triples:         number;
  home_runs:       number;
  rbi:             number;
  runs:            number;
  walks:           number;
  strikeouts_bat:  number;
  hit_by_pitch:    number;
  stolen_bases:    number;
  // Pitching
  innings_pitched: number;
  hits_allowed:    number;
  runs_allowed:    number;
  earned_runs:     number;
  walks_allowed:   number;
  strikeouts_pit:  number;
  wild_pitches:    number;
  hit_batters:     number;
  // Fielding
  putouts:         number;
  assists:         number;
  errors:          number;
};

export type ParsedGCStatsData = {
  filename: string;
  teamMeta: { name: string; year: string; season: string };
  players:  ParsedGCPlayerStats[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a column-name → column-index map for a named section
 * (Batting / Pitching / Fielding) using the two-row GC header structure.
 */
function buildSectionColMap(
  categoryRow: string[],
  headerRow:   string[],
  sectionName: string,
): Record<string, number> {
  // Find where this section starts in the category row
  let start = -1;
  for (let i = 0; i < categoryRow.length; i++) {
    if (categoryRow[i].trim() === sectionName) { start = i; break; }
  }
  if (start < 0) return {};

  // Find where the next section begins
  const SECTIONS = ["Batting", "Pitching", "Fielding"];
  let end = headerRow.length;
  for (let i = start + 1; i < categoryRow.length; i++) {
    if (SECTIONS.includes(categoryRow[i].trim())) { end = i; break; }
  }

  const map: Record<string, number> = {};
  for (let i = start; i < end; i++) {
    const h = headerRow[i].trim();
    if (h && !(h in map)) map[h] = i; // first occurrence wins (handles duplicates in section)
  }
  return map;
}

function num(val: string | undefined): number {
  if (!val || val === "-" || val === "N/A") return 0;
  return parseFloat(val) || 0;
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseGameChangerStatsCSV(
  text: string,
  filename: string,
): ParsedGCStatsData {
  const rows = parseCSVText(text);
  if (rows.length < 3) throw new Error("File appears empty or unrecognised.");

  // Row 0 = category row ("Batting" starts at col 3, "Pitching" later, "Fielding" near end)
  // Row 1 = column-header row
  const categoryRow = rows[0];
  const headerRow   = rows[1];

  const bat = buildSectionColMap(categoryRow, headerRow, "Batting");
  const pit = buildSectionColMap(categoryRow, headerRow, "Pitching");
  const fld = buildSectionColMap(categoryRow, headerRow, "Fielding");

  if (!("AB" in bat)) {
    throw new Error(
      "Could not find batting stats columns. Make sure this is a GameChanger season stats export, not a roster export.",
    );
  }

  const players: ParsedGCPlayerStats[] = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const jersey = row[0]?.trim() ?? "";
    const last   = row[1]?.trim() ?? "";
    const first  = row[2]?.trim() ?? "";

    // Skip metadata rows
    if (jersey === "Number" || jersey === "Totals" || jersey === "Glossary") continue;
    if (!last && !first) continue;

    players.push({
      jersey_number:   jersey,
      last_name:       last,
      first_name:      first,
      games_played:    num(row[bat["GP"]]),
      // Batting
      at_bats:         num(row[bat["AB"]]),
      hits:            num(row[bat["H"]]),
      doubles:         num(row[bat["2B"]]),
      triples:         num(row[bat["3B"]]),
      home_runs:       num(row[bat["HR"]]),
      rbi:             num(row[bat["RBI"]]),
      runs:            num(row[bat["R"]]),
      walks:           num(row[bat["BB"]]),
      strikeouts_bat:  num(row[bat["SO"]]),
      hit_by_pitch:    num(row[bat["HBP"]]),
      stolen_bases:    num(row[bat["SB"]]),
      // Pitching
      innings_pitched: num(row[pit["IP"]]),
      hits_allowed:    num(row[pit["H"]]),
      runs_allowed:    num(row[pit["R"]]),
      earned_runs:     num(row[pit["ER"]]),
      walks_allowed:   num(row[pit["BB"]]),
      strikeouts_pit:  num(row[pit["SO"]]),
      wild_pitches:    num(row[pit["WP"]]),
      hit_batters:     num(row[pit["HBP"]]),
      // Fielding
      putouts:  num(row[fld["PO"]]),
      assists:  num(row[fld["A"]]),
      errors:   num(row[fld["E"]]),
    });
  }

  if (players.length === 0) {
    throw new Error(
      "No player rows found. Check that this is a GameChanger season stats export.",
    );
  }

  const meta = parseGCFilename(filename);
  return {
    filename,
    teamMeta: { name: meta.name, year: meta.year, season: meta.season },
    players,
  };
}
