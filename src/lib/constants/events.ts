export const EVENT_TYPES = ["game", "practice", "scrimmage", "fundraiser", "other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_META: Record<
  EventType,
  { label: string; color: string; bgColor: string; border: string }
> = {
  game: {
    label:   "Game",
    color:   "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    border:  "border-blue-200 dark:border-blue-800",
  },
  practice: {
    label:   "Practice",
    color:   "text-green-700 dark:text-green-300",
    bgColor: "bg-green-50 dark:bg-green-950/40",
    border:  "border-green-200 dark:border-green-800",
  },
  scrimmage: {
    label:   "Scrimmage",
    color:   "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
    border:  "border-amber-200 dark:border-amber-800",
  },
  fundraiser: {
    label:   "Fundraiser",
    color:   "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-50 dark:bg-purple-950/40",
    border:  "border-purple-200 dark:border-purple-800",
  },
  other: {
    label:   "Other",
    color:   "text-slate-600 dark:text-slate-300",
    bgColor: "bg-slate-50 dark:bg-slate-900/40",
    border:  "border-slate-200 dark:border-slate-700",
  },
};

export type TeamEvent = {
  id:         string;
  user_id:    string;
  team_id:    string | null;
  roster_id:  string | null;
  lineup_id:  string | null;
  type:       EventType;
  title:      string;
  opponent:   string | null;
  event_date: string;         // "YYYY-MM-DD"
  start_time: string | null;  // "HH:MM" 24-h
  end_time:   string | null;
  location:   string | null;
  notes:      string | null;
  is_home:    boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateEventInput = {
  team_id:    string | null;
  roster_id:  string | null;
  lineup_id:  string | null;
  type:       EventType;
  title:      string;
  opponent:   string | null;
  event_date: string;
  start_time: string | null;
  end_time:   string | null;
  location:   string | null;
  notes:      string | null;
  is_home:    boolean;
};

export type UpdateEventInput = CreateEventInput & { id: string };
