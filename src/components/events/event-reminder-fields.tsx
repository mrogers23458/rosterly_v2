"use client";

import { Bell, Mail, MessageSquare, Plus, Smartphone, Trash2 } from "lucide-react";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  REMINDER_CHANNELS,
  REMINDER_PRESETS,
  REMINDER_UNIT_LABELS,
  type ReminderChannel,
  type ReminderDraft,
  type ReminderUnit,
} from "@/lib/constants/reminders";

type Props = {
  reminders:  ReminderDraft[];
  onChange:   (reminders: ReminderDraft[]) => void;
};

const CHANNEL_ICONS: Record<ReminderChannel, React.ReactNode> = {
  email:  <Mail       className="h-3.5 w-3.5" />,
  sms:    <Smartphone className="h-3.5 w-3.5" />,
  in_app: <Bell       className="h-3.5 w-3.5" />,
};

function makeKey() {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function EventReminderFields({ reminders, onChange }: Props) {
  const uid = useId();

  function addReminder() {
    onChange([
      ...reminders,
      { key: makeKey(), channels: ["in_app"], amount: 1, unit: "hours" },
    ]);
  }

  function removeReminder(key: string) {
    onChange(reminders.filter((r) => r.key !== key));
  }

  function updateReminder(key: string, patch: Partial<ReminderDraft>) {
    onChange(reminders.map((r) => r.key === key ? { ...r, ...patch } : r));
  }

  function toggleChannel(key: string, channel: ReminderChannel) {
    const reminder = reminders.find((r) => r.key === key);
    if (!reminder) return;
    const has = reminder.channels.includes(channel);
    // Must keep at least one channel
    if (has && reminder.channels.length === 1) return;
    const channels = has
      ? reminder.channels.filter((c) => c !== channel)
      : [...reminder.channels, channel];
    updateReminder(key, { channels });
  }

  function applyPreset(key: string, amount: number, unit: ReminderUnit) {
    updateReminder(key, { amount, unit });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Bell className="h-3.5 w-3.5 text-muted-foreground" />
        <Label>Reminders</Label>
      </div>

      {reminders.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No reminders set. Add one below to notify team members before the event.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {reminders.map((reminder, idx) => (
          <div
            key={reminder.key}
            className="relative rounded-lg border border-border bg-muted/30 p-3"
          >
            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeReminder(reminder.key)}
              className="absolute right-2.5 top-2.5 rounded p-1 text-muted-foreground/50 hover:text-destructive transition-colors"
              aria-label="Remove reminder"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            <div className="flex flex-col gap-3 pr-6">
              {/* Row 1: presets */}
              <div className="flex flex-wrap gap-1.5">
                {REMINDER_PRESETS.map((p) => {
                  const active =
                    reminder.amount === p.amount && reminder.unit === p.unit;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(reminder.key, p.amount, p.unit)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
                <span className="self-center text-xs text-muted-foreground">or custom:</span>
              </div>

              {/* Row 2: custom amount + unit */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  id={`${uid}-amount-${idx}`}
                  min={1}
                  max={999}
                  value={reminder.amount}
                  onChange={(e) => updateReminder(
                    reminder.key,
                    { amount: Math.max(1, parseInt(e.target.value) || 1) },
                  )}
                  className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <select
                  id={`${uid}-unit-${idx}`}
                  value={reminder.unit}
                  onChange={(e) => updateReminder(reminder.key, { unit: e.target.value as ReminderUnit })}
                  className="flex h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {(["minutes", "hours", "days"] as ReminderUnit[]).map((u) => (
                    <option key={u} value={u}>{REMINDER_UNIT_LABELS[u]}</option>
                  ))}
                </select>
                <span className="text-sm text-muted-foreground">before event</span>
              </div>

              {/* Row 3: channel toggles */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Send via:</span>
                {(Object.keys(REMINDER_CHANNELS) as ReminderChannel[]).map((channel) => {
                  const active = reminder.channels.includes(channel);
                  const cfg    = REMINDER_CHANNELS[channel];
                  return (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => toggleChannel(reminder.key, channel)}
                      title={cfg.description}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                      )}
                    >
                      {CHANNEL_ICONS[channel]}
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addReminder}
        className="flex items-center gap-1.5 self-start text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add reminder
      </button>

      {reminders.some((r) => r.channels.includes("sms")) && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Text reminders require <strong>Twilio</strong> credentials in your environment variables
          (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER).
        </p>
      )}
    </div>
  );
}
