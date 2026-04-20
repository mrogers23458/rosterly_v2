export type ReminderChannel = "email" | "sms" | "in_app";

export const REMINDER_CHANNELS: Record<
  ReminderChannel,
  { label: string; description: string }
> = {
  email:  { label: "Email",    description: "Send to team member emails" },
  sms:    { label: "Text",     description: "Send to guardian phone numbers" },
  in_app: { label: "In-app",   description: "Notify inside Rosterly" },
};

export type ReminderUnit = "minutes" | "hours" | "days";

export const REMINDER_UNIT_LABELS: Record<ReminderUnit, string> = {
  minutes: "minutes",
  hours:   "hours",
  days:    "days",
};

export function unitToMinutes(amount: number, unit: ReminderUnit): number {
  if (unit === "days")    return amount * 1440;
  if (unit === "hours")   return amount * 60;
  return amount;
}

export function minutesToUnit(minutes: number): { amount: number; unit: ReminderUnit } {
  if (minutes % 1440 === 0) return { amount: minutes / 1440, unit: "days" };
  if (minutes % 60   === 0) return { amount: minutes / 60,   unit: "hours" };
  return { amount: minutes, unit: "minutes" };
}

/** A single reminder rule as edited in the form (before converting to DB record). */
export type ReminderDraft = {
  /** Stable local key for React */
  key:      string;
  channels: ReminderChannel[];
  amount:   number;
  unit:     ReminderUnit;
};

/** A persisted reminder record from event_reminders table. */
export type EventReminder = {
  id:             string;
  event_id:       string;
  user_id:        string;
  channel:        ReminderChannel;
  minutes_before: number;
  created_at:     string;
};

/** A persisted in-app notification. */
export type AppNotification = {
  id:         string;
  user_id:    string;
  event_id:   string | null;
  title:      string;
  body:       string | null;
  link:       string | null;
  read_at:    string | null;
  created_at: string;
};

/** Quick-pick presets shown in the reminder form. */
export const REMINDER_PRESETS: Array<{ label: string; amount: number; unit: ReminderUnit }> = [
  { label: "30 min",  amount: 30, unit: "minutes" },
  { label: "2 hours", amount: 2,  unit: "hours"   },
  { label: "8 hours", amount: 8,  unit: "hours"   },
  { label: "1 day",   amount: 1,  unit: "days"    },
  { label: "2 days",  amount: 2,  unit: "days"    },
];

/**
 * Converts flat EventReminder[] rows (one row per channel) back into
 * ReminderDraft[] (one draft per unique minutes_before, with multiple channels).
 */
export function remindersToDrafts(reminders: EventReminder[]): ReminderDraft[] {
  const grouped = new Map<number, ReminderChannel[]>();
  for (const r of reminders) {
    const arr = grouped.get(r.minutes_before) ?? [];
    if (!arr.includes(r.channel)) arr.push(r.channel);
    grouped.set(r.minutes_before, arr);
  }

  return Array.from(grouped.entries()).map(([minutes, channels], i) => {
    const unit =
      minutes % 1440 === 0 ? "days" as const :
      minutes % 60   === 0 ? "hours" as const :
                             "minutes" as const;
    const amount =
      unit === "days"  ? minutes / 1440 :
      unit === "hours" ? minutes / 60   :
                         minutes;
    return { key: `loaded-${i}`, channels, amount, unit };
  });
}
