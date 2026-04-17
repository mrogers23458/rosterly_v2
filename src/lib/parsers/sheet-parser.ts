import type { ImportPlayerInput } from "@/app/actions/import";

// ─── Field types ──────────────────────────────────────────────────────────────

export type FieldType =
  | "firstName"
  | "lastName"
  | "fullName"
  | "jerseyNumber"
  | "primaryPosition"
  | "secondaryPosition"
  | "bats"
  | "throws"
  | "active"
  | "skip";

export const FIELD_LABELS: Record<FieldType, string> = {
  firstName:         "First name",
  lastName:          "Last name",
  fullName:          "Full name (auto-split)",
  jerseyNumber:      "Jersey #",
  primaryPosition:   "Primary position(s)",
  secondaryPosition: "Secondary position(s)",
  bats:              "Bats (L/R/S)",
  throws:            "Throws (L/R)",
  active:            "Active status",
  skip:              "Skip (don't import)",
};

// ─── Aliases for auto-detection ───────────────────────────────────────────────

const ALIASES: Record<Exclude<FieldType, "skip">, string[]> = {
  firstName: [
    "first name", "first", "fname", "given name", "given", "player first", "first_name",
  ],
  lastName: [
    "last name", "last", "lname", "surname", "family name", "family", "player last", "last_name",
  ],
  fullName: [
    "name", "player name", "player", "full name", "fullname", "athlete", "full_name",
    "player_name", "roster name", "athlete name",
  ],
  jerseyNumber: [
    "jersey", "#", "number", "num", "jersey #", "jersey number", "no", "no.",
    "uniform", "uniform #", "jersey_number", "jersey_num", "uniform number",
  ],
  primaryPosition: [
    "position", "pos", "primary position", "primary pos", "positions", "prim pos",
    "primary_position", "pos1", "position 1",
  ],
  secondaryPosition: [
    "secondary position", "secondary pos", "sec pos", "other position", "other pos",
    "secondary_position", "pos2", "position 2", "alt position", "alt pos",
  ],
  bats: ["bats", "batting", "bat", "b/t", "bats/throws"],
  throws: ["throws", "throwing", "throw", "arm", "throwing hand"],
  active: ["active", "status", "roster status", "is_active", "on roster"],
};

function normalizeKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9#/]+/g, " ").trim();
}

export function detectFieldType(header: string): FieldType {
  const key = normalizeKey(header);
  for (const [type, aliases] of Object.entries(ALIASES) as [Exclude<FieldType, "skip">, string[]][]) {
    if (aliases.includes(key)) return type;
  }
  return "skip";
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

export function parseCSVText(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let inQuote = false;
    let cell = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        row.push(cell.trim());
        cell = "";
      } else {
        cell += ch;
      }
    }
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

// ─── GameChanger format detection ─────────────────────────────────────────────

/** Returns true if the CSV looks like a GameChanger stats export. */
export function isGameChangerFormat(rows: string[][]): boolean {
  // GC exports have row[1] = ["Number","Last","First",...]
  const r = rows[1] ?? [];
  return (
    (r[0] === "Number" || r[0] === "") &&
    r[1] === "Last" &&
    r[2] === "First"
  );
}

// ─── Header row detection ─────────────────────────────────────────────────────

/** Finds the index of the best candidate for a header row. */
export function detectHeaderRowIndex(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    const matches = row.filter((h) => detectFieldType(h) !== "skip").length;
    if (matches >= 2) return i;
  }
  // Fallback: first non-empty row
  return rows.findIndex((r) => r.some((c) => c.length > 0));
}

// ─── Column map ───────────────────────────────────────────────────────────────

export type ColumnMap = { index: number; header: string; fieldType: FieldType }[];

export function buildColumnMap(headerRow: string[]): ColumnMap {
  const usedTypes = new Set<FieldType>();
  return headerRow.map((header, index) => {
    const detected = detectFieldType(header);
    // Only assign each non-skip type once to avoid duplicate mappings
    if (detected !== "skip" && usedTypes.has(detected)) {
      return { index, header, fieldType: "skip" };
    }
    if (detected !== "skip") usedTypes.add(detected);
    return { index, header, fieldType: detected };
  });
}

// ─── Pre-header metadata ──────────────────────────────────────────────────────

export type SheetMetadata = {
  teamName?: string;
  season?:   string;
  year?:     string;
  division?: string;
  org?:      string;
};

const META_PATTERNS: { pattern: RegExp; key: keyof SheetMetadata }[] = [
  { pattern: /team\s*(?:name)?[:=]\s*(.+)/i,    key: "teamName" },
  { pattern: /season[:=]\s*(.+)/i,               key: "season"   },
  { pattern: /year[:=]\s*(20\d{2})/i,            key: "year"     },
  { pattern: /division[:=]\s*(.+)/i,             key: "division" },
  { pattern: /org(?:anization)?[:=]\s*(.+)/i,    key: "org"      },
];

export function extractSheetMetadata(rows: string[][], headerRowIndex: number): SheetMetadata {
  const meta: SheetMetadata = {};
  const preRows = rows.slice(0, headerRowIndex);

  // Also check for a year in any cell
  for (const row of preRows) {
    const joined = row.join(" ");
    for (const { pattern, key } of META_PATTERNS) {
      if (meta[key]) continue;
      const match = joined.match(pattern);
      if (match) meta[key] = match[1].trim();
    }
    // Fallback: look for a standalone year
    if (!meta.year) {
      const yearMatch = joined.match(/\b(20\d{2})\b/);
      if (yearMatch) meta.year = yearMatch[1];
    }
    // Fallback: look for a season keyword
    if (!meta.season) {
      const seasonMatch = joined.match(/\b(Spring|Summer|Fall|Winter)\b/i);
      if (seasonMatch) meta.season = seasonMatch[1];
    }
  }

  return meta;
}

// ─── Position normalization ───────────────────────────────────────────────────

const POSITION_MAP: Record<string, string> = {
  p:     "P", pitcher: "P",
  c:     "C", catcher: "C",
  "1b":  "1B", first: "1B", "first base": "1B",
  "2b":  "2B", second: "2B", "second base": "2B",
  "3b":  "3B", third: "3B", "third base": "3B",
  ss:    "SS", shortstop: "SS",
  lf:    "LF", "left field": "LF", left: "LF",
  cf:    "CF", "center field": "CF", center: "CF",
  rf:    "RF", "right field": "RF", right: "RF",
  bench: "Bench", bh: "Bench", dh: "DH",
};

export function normalizePosition(raw: string): string {
  const key = raw.toLowerCase().trim();
  return POSITION_MAP[key] ?? raw.toUpperCase().trim();
}

function splitPositions(raw: string): string[] {
  return raw
    .split(/[,;/|]+/)
    .map((p) => normalizePosition(p.trim()))
    .filter(Boolean);
}

// ─── Name splitting ───────────────────────────────────────────────────────────

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  if (parts.length === 2) return { first: parts[0], last: parts[1] };
  // 3+ words: assume last word is last name
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

// ─── Extract players using column map ────────────────────────────────────────

export function extractPlayersFromRows(
  dataRows: string[][],
  columnMap: ColumnMap,
): ImportPlayerInput[] {
  const players: ImportPlayerInput[] = [];

  const col = (type: FieldType): number =>
    columnMap.find((c) => c.fieldType === type)?.index ?? -1;

  const firstIdx   = col("firstName");
  const lastIdx    = col("lastName");
  const fullIdx    = col("fullName");
  const jerseyIdx  = col("jerseyNumber");
  const primIdx    = col("primaryPosition");
  const secIdx     = col("secondaryPosition");
  const batsIdx    = col("bats");
  const throwsIdx  = col("throws");
  const activeIdx  = col("active");

  for (const row of dataRows) {
    // Skip clearly empty or summary rows
    if (row.every((c) => !c)) continue;

    let firstName = "";
    let lastName  = "";

    if (firstIdx >= 0 || lastIdx >= 0) {
      firstName = (firstIdx >= 0 ? row[firstIdx] : "") ?? "";
      lastName  = (lastIdx  >= 0 ? row[lastIdx]  : "") ?? "";
    } else if (fullIdx >= 0) {
      const full = row[fullIdx] ?? "";
      const split = splitName(full);
      firstName = split.first;
      lastName  = split.last;
    }

    // Must have at least a name
    if (!firstName && !lastName) continue;
    // Skip totals / label rows
    const combined = `${firstName} ${lastName}`.toLowerCase();
    if (combined.includes("total") || combined.includes("glossary")) continue;

    const rawBats   = batsIdx   >= 0 ? (row[batsIdx]   ?? "") : "";
    const rawThrows = throwsIdx >= 0 ? (row[throwsIdx] ?? "") : "";

    // Some sheets encode bats/throws as "R/R" or "L/R" in one column
    let bats   = rawBats.trim().toUpperCase();
    let throws = rawThrows.trim().toUpperCase();
    if (bats.includes("/") && !throws) {
      const [b, t] = bats.split("/");
      bats   = b ?? "";
      throws = t ?? "";
    }

    const rawPrim = primIdx >= 0 ? (row[primIdx] ?? "") : "";
    const rawSec  = secIdx  >= 0 ? (row[secIdx]  ?? "") : "";

    const primaryPositions   = rawPrim ? splitPositions(rawPrim) : [];
    const secondaryPositions = rawSec  ? splitPositions(rawSec)  : [];

    const rawActive = activeIdx >= 0 ? (row[activeIdx] ?? "yes") : "yes";
    const isActive  = !["no", "false", "0", "inactive", "n"].includes(rawActive.toLowerCase().trim());

    players.push({
      first_name:          firstName,
      last_name:           lastName,
      jersey_number:       jerseyIdx >= 0 ? (row[jerseyIdx] ?? "") : "",
      primary_positions:   primaryPositions,
      secondary_positions: secondaryPositions,
      bats:                ["L", "R", "S", "B"].includes(bats) ? bats : "",
      throws:              ["L", "R"].includes(throws) ? throws : "",
      is_active:           isActive,
    });
  }

  return players;
}

// ─── Top-level parse ──────────────────────────────────────────────────────────

export type ParsedSheet = {
  rows:           string[][];
  headerRowIndex: number;
  columnMap:      ColumnMap;
  metadata:       SheetMetadata;
  /** Convenience: how many mapped (non-skip) columns were auto-detected */
  mappedCount:    number;
  isGcFormat:     boolean;
};

export function parseSheet(csvText: string): ParsedSheet {
  const rows = parseCSVText(csvText);
  const isGcFormat = isGameChangerFormat(rows);

  let headerRowIndex: number;
  let columnMap: ColumnMap;

  if (isGcFormat) {
    // GC format: row 1 has the actual column headers
    headerRowIndex = 1;
    columnMap = buildColumnMap(rows[1] ?? []);
  } else {
    headerRowIndex = detectHeaderRowIndex(rows);
    columnMap = buildColumnMap(rows[headerRowIndex] ?? []);
  }

  const metadata = extractSheetMetadata(rows, headerRowIndex);

  const mappedCount = columnMap.filter((c) => c.fieldType !== "skip").length;

  return { rows, headerRowIndex, columnMap, metadata, mappedCount, isGcFormat };
}
