export type Team = {
  id: string; user_id: string; name: string; year: string; season: string;
  division: string; age_group: string; team_type: string; organization: string | null;
  is_active: boolean; is_archived: boolean; created_at: string; updated_at: string;
};

export type Roster = {
  id: string; user_id: string; team_id: string | null; name: string;
  season: string; year: string; is_active: boolean; is_archived: boolean;
  notes: string | null; created_at: string; updated_at: string;
};

export type Player = {
  id: string; user_id: string; roster_id: string; first_name: string; last_name: string;
  preferred_name: string | null; jersey_number: string | null; date_of_birth: string | null;
  bats: string | null; throws: string | null; primary_positions: string[];
  secondary_positions: string[]; is_active: boolean; parent_guardian_name: string | null;
  parent_guardian_email: string | null; parent_guardian_phone: string | null;
  medical_notes: string | null; uniform_size: string | null; notes: string | null;
  created_at: string; updated_at: string;
};

export type GameLineup = {
  id: string; user_id: string; team_id: string; roster_id: string | null;
  name: string; game_date: string | null; inning_count: number;
  notes: string | null; is_archived: boolean; created_at: string; updated_at: string;
};

export type LineupEntryRow = {
  id: string; batting_order: number; jersey_number: string | null;
  player_name: string; innings: string[];
};

export const EVENT_TYPES = ["game", "practice", "scrimmage", "fundraiser", "other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type TeamEvent = {
  id: string; user_id: string; team_id: string | null; roster_id: string | null;
  lineup_id: string | null; type: EventType; title: string; opponent: string | null;
  event_date: string; start_time: string | null; end_time: string | null;
  location: string | null; notes: string | null; is_home: boolean; is_archived: boolean;
  recurrence_type: string | null; recurrence_end_date: string | null;
  recurrence_group_id: string | null; created_at: string; updated_at: string;
};

export const EVENT_TYPE_LABEL: Record<string, string> = {
  game: "Game", practice: "Practice", scrimmage: "Scrimmage",
  fundraiser: "Fundraiser", other: "Other",
};
