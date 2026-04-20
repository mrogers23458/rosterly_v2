export const TEAM_TYPES = [
  "Little League",
  "Travel",
  "All-Stars",
  "Recreational",
  "School",
] as const;

export type TeamType = (typeof TEAM_TYPES)[number];

export const SEASONS = [
  "Spring",
  "Summer",
  "Fall",
  "Winter",
  "Other",
] as const;

export type Season = (typeof SEASONS)[number];

export const DIVISIONS = ["A", "AA", "AAA", "Majors"] as const;

export type Division = (typeof DIVISIONS)[number];

export const AGE_GROUPS = [
  "6U", "7U", "8U", "9U", "10U", "11U", "12U", "13U", "14U",
] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];

export const POSITIONS = ["P", "C", "1B", "2B", "SS", "3B", "CF", "LF", "RF", "LC", "RC", "EF"] as const;
export type Position = (typeof POSITIONS)[number];

/** Positions available in a lineup inning cell (field positions + Bench) */
export const LINEUP_POSITIONS = ["P", "C", "1B", "2B", "SS", "3B", "RF", "CF", "LF", "Bench"] as const;
/** The 9 field positions that must all appear in a valid inning */
export const FIELD_POSITIONS  = ["P", "C", "1B", "2B", "SS", "3B", "RF", "CF", "LF"] as const;

export const BATS_OPTIONS   = [{ value: "L", label: "Left" }, { value: "R", label: "Right" }, { value: "S", label: "Switch" }] as const;
export const THROWS_OPTIONS = [{ value: "L", label: "Left" }, { value: "R", label: "Right" }] as const;

export const UNIFORM_SIZES = ["YXS", "YS", "YM", "YL", "YXL", "AS", "AM", "AL", "AXL", "A2XL"] as const;

export type Player = {
  id: string;
  user_id: string;
  roster_id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
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
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Roster = {
  id: string;
  user_id: string;
  team_id: string | null;
  name: string;
  season: string;
  year: string;
  is_active: boolean;
  is_archived: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type GameLineup = {
  id: string;
  user_id: string;
  team_id: string;
  roster_id: string | null;
  name: string;
  game_date: string | null;
  inning_count: number;
  notes: string | null;
  is_archived: boolean;
  share_token: string | null;
  created_at: string;
  updated_at: string;
};

export type LineupEntry = {
  id: string;
  lineup_id: string;
  batting_order: number;
  jersey_number: string | null;
  player_name: string;
  innings: string[];
};

export type Team = {
  id: string;
  user_id: string;
  name: string;
  year: string;
  season: string;
  division: string;
  age_group: string;
  team_type: string;
  organization: string | null;
  is_active: boolean;
  is_archived: boolean;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};
