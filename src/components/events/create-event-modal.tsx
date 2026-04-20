"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createEvent } from "@/app/actions/events";
import { saveEventReminders } from "@/app/actions/reminders";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogBody, DialogContent,
  DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { EventFormFields } from "@/components/events/event-form-fields";
import { EventReminderFields } from "@/components/events/event-reminder-fields";
import { EVENT_TYPE_META, type EventType, type RecurrenceType } from "@/lib/constants/events";
import type { ReminderDraft } from "@/lib/constants/reminders";
import type { GameLineup, Roster, Team } from "@/lib/constants/teams";

type Props = {
  open:              boolean;
  onOpenChange:      (v: boolean) => void;
  teams:             Team[];
  rosters:           Roster[];
  lineups:           GameLineup[];
  defaultTeamId?:    string;
  defaultLineupId?:  string;
  defaultRosterId?:  string;
  defaultEventDate?: string;
};

export function CreateEventModal({
  open, onOpenChange, teams, rosters, lineups,
  defaultTeamId = "", defaultLineupId = "", defaultRosterId = "", defaultEventDate = "",
}: Props) {
  const router = useRouter();

  const [type,       setType]       = useState<EventType>("game");
  const [title,      setTitle]      = useState("");
  const [opponent,   setOpponent]   = useState("");
  const [eventDate,  setEventDate]  = useState(defaultEventDate);
  const [startTime,  setStartTime]  = useState("");
  const [endTime,    setEndTime]    = useState("");
  const [location,   setLocation]   = useState("");
  const [notes,      setNotes]      = useState("");
  const [isHome,     setIsHome]     = useState(true);
  const [teamId,     setTeamId]     = useState(defaultTeamId);
  const [rosterId,   setRosterId]   = useState(defaultRosterId);
  const [lineupId,   setLineupId]   = useState(defaultLineupId);
  const [recurrenceType,    setRecurrenceType]    = useState<RecurrenceType | null>(null);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [done,       setDone]       = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending,  startTransition] = useTransition();

  const [reminders, setReminders] = useState<ReminderDraft[]>([]);

  function resetForm() {
    setType("game");
    setTitle("");
    setOpponent("");
    setEventDate(defaultEventDate);
    setStartTime("");
    setEndTime("");
    setLocation("");
    setNotes("");
    setIsHome(true);
    setTeamId(defaultTeamId);
    setRosterId(defaultRosterId);
    setLineupId(defaultLineupId);
    setRecurrenceType(null);
    setRecurrenceEndDate("");
    setDone(false);
    setSubmitError(null);
    setReminders([]);
  }

  function handleOpenChange(v: boolean) {
    if (!v) resetForm();
    onOpenChange(v);
  }

  function generateTitle() {
    const meta = EVENT_TYPE_META[type];
    const label = meta?.label ?? type;
    if ((type === "game" || type === "scrimmage") && opponent.trim()) {
      return `${label} vs. ${opponent.trim()}`;
    }
    if (eventDate) {
      const d = new Date(eventDate + "T00:00:00");
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return `${label} – ${dateStr}`;
    }
    return label;
  }

  function handleSubmit() {
    if (!eventDate) {
      setSubmitError("Date is required.");
      return;
    }
    if (recurrenceType && !recurrenceEndDate) {
      setSubmitError("Please set an end date for the recurring event.");
      return;
    }
    if (recurrenceType && recurrenceEndDate && recurrenceEndDate <= eventDate) {
      setSubmitError("Recurrence end date must be after the start date.");
      return;
    }

    startTransition(async () => {
      setSubmitError(null);
      const res = await createEvent({
        team_id:    teamId   || null,
        roster_id:  rosterId || null,
        lineup_id:  lineupId || null,
        type,
        title:      title.trim() || generateTitle(),
        opponent:   opponent  || null,
        event_date: eventDate,
        start_time: startTime || null,
        end_time:   endTime   || null,
        location:   location  || null,
        notes:      notes     || null,
        is_home:    isHome,
        recurrence_type:     recurrenceType,
        recurrence_end_date: recurrenceEndDate || null,
      });

      if (res.error || !res.data) {
        setSubmitError(res.error ?? "Failed to create event.");
        return;
      }

      // Save reminders (best-effort, don't block on error)
      if (reminders.length > 0 && res.data.id) {
        await saveEventReminders(res.data.id, reminders);
      }

      setDone(true);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
          <DialogDescription>
            Schedule a game, practice, scrimmage, or other team event.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {done ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="font-semibold">
                {recurrenceType ? "Recurring events created!" : "Event created!"}
              </p>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <EventFormFields
                type={type}       onType={setType}
                title={title}     onTitle={setTitle}
                opponent={opponent}   onOpponent={setOpponent}
                eventDate={eventDate} onEventDate={setEventDate}
                startTime={startTime} onStartTime={setStartTime}
                endTime={endTime}     onEndTime={setEndTime}
                location={location}   onLocation={setLocation}
                notes={notes}         onNotes={setNotes}
                isHome={isHome}       onIsHome={setIsHome}
                teamId={teamId}       onTeamId={setTeamId}
                rosterId={rosterId}   onRosterId={setRosterId}
                lineupId={lineupId}   onLineupId={setLineupId}
                recurrenceType={recurrenceType}
                recurrenceEndDate={recurrenceEndDate}
                onRecurrenceType={setRecurrenceType}
                onRecurrenceEndDate={setRecurrenceEndDate}
                teams={teams}
                rosters={rosters}
                lineups={lineups}
              />

              <div className="border-t border-border pt-4">
                <EventReminderFields
                  reminders={reminders}
                  onChange={setReminders}
                />
              </div>

              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create event
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
