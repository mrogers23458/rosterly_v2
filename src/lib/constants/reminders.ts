export type ReminderChannel = "email" | "sms" | "in_app" | "push" | "team_chat";
export type ReminderKind = "event_reminder" | "rsvp_follow_up";
export type ReminderAudience = "all_members" | "non_responders";

export const REMINDER_CHANNELS: Record<
  ReminderChannel,
  { label: string; description: string }
> = {
  email:     { label: "Email",     description: "Send to team member emails" },
  sms:       { label: "Text",      description: "Send to guardian phone numbers" },
  in_app:    { label: "In-app",    description: "Notify inside Rosterly" },
  push:      { label: "Push",      description: "Send browser push notifications" },
  team_chat: { label: "Team chat", description: "Post a reminder in team chat" },
};

export const REMINDER_KIND_LABELS: Record<
  ReminderKind,
  { label: string; description: string; audience: ReminderAudience }
> = {
  event_reminder: {
    label: "Event reminder",
    description: "Notifies all team members before the event starts.",
    audience: "all_members",
  },
  rsvp_follow_up: {
    label: "RSVP follow-up",
    description: "Final reminder at RSVP deadline for people who have not responded.",
    audience: "non_responders",
  },
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
  kind:     ReminderKind;
  channels: ReminderChannel[];
  amount:   number;
  unit:     ReminderUnit;
};

/** A persisted reminder record from event_reminders table. */
export type EventReminder = {
  id:             string;
  event_id:       string;
  user_id:        string;
  kind:           ReminderKind;
  audience:       ReminderAudience;
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
  { label: "1 hour",  amount: 1,  unit: "hours"   },
  { label: "2 hours", amount: 2,  unit: "hours"   },
  { label: "8 hours", amount: 8,  unit: "hours"   },
  { label: "1 day",   amount: 1,  unit: "days"    },
  { label: "1 week",  amount: 7,  unit: "days"    },
  { label: "2 days",  amount: 2,  unit: "days"    },
];

/**
 * Converts flat EventReminder[] rows (one row per channel) back into
 * ReminderDraft[] (one draft per unique minutes_before, with multiple channels).
 */
export function remindersToDrafts(reminders: EventReminder[]): ReminderDraft[] {
  const grouped = new Map<string, { channels: ReminderChannel[]; kind: ReminderKind; audience: ReminderAudience; minutesBefore: number }>();
  for (const r of reminders) {
    const groupKey = `${r.kind}:${r.audience}:${r.minutes_before}`;
    const existing = grouped.get(groupKey) ?? {
      channels: [],
      kind: r.kind,
      audience: r.audience,
      minutesBefore: r.minutes_before,
    };
    const arr = existing.channels;
    if (!arr.includes(r.channel)) arr.push(r.channel);
    grouped.set(groupKey, existing);
  }

  return Array.from(grouped.values()).map((group, i) => {
    const minutes = group.minutesBefore;
    const unit =
      minutes % 1440 === 0 ? "days" as const :
      minutes % 60   === 0 ? "hours" as const :
                             "minutes" as const;
    const amount =
      unit === "days"  ? minutes / 1440 :
      unit === "hours" ? minutes / 60   :
                         minutes;
    return {
      key: `loaded-${i}`,
      kind: group.kind,
      channels: group.channels,
      amount: group.kind === "rsvp_follow_up" ? 0 : amount,
      unit: group.kind === "rsvp_follow_up" ? "minutes" : unit,
    };
  });
}
